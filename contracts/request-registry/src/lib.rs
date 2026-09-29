#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, panic_with_error, Address,
    BytesN, Env,
};

/// Persistent entries are extended to roughly 120,000 ledgers when accessed.
/// With the 100,000-ledger threshold, ordinary reads refresh an entry before
/// it expires while avoiding writes to the TTL on every recent access.
/// These are operational lease values, not a claim of permanent storage or
/// Soroban's protocol maximum. Callers must keep records alive by reading them.
const TTL_EXTENSION_THRESHOLD: u32 = 100_000;
const TTL_EXTEND_TO: u32 = 120_000;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Registration {
    pub registrant: Address,
    pub created_at: u64,
    pub ledger: u32,
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Request(BytesN<32>),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum RegistryError {
    AlreadyRegistered = 1,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RequestRegistered {
    #[topic]
    pub request_hash: BytesN<32>,
    #[topic]
    pub registrant: Address,
    pub created_at: u64,
    pub ledger: u32,
}

#[contract]
pub struct RequestRegistry;

#[contractimpl]
impl RequestRegistry {
    pub fn register(env: Env, registrant: Address, request_hash: BytesN<32>) {
        registrant.require_auth();

        let key = DataKey::Request(request_hash.clone());
        let storage = env.storage().persistent();
        if storage.has(&key) {
            panic_with_error!(&env, RegistryError::AlreadyRegistered);
        }

        let created_at = env.ledger().timestamp();
        let ledger = env.ledger().sequence();
        let registration = Registration {
            registrant: registrant.clone(),
            created_at,
            ledger,
        };

        storage.set(&key, &registration);
        storage.extend_ttl(&key, TTL_EXTENSION_THRESHOLD, TTL_EXTEND_TO);

        RequestRegistered {
            request_hash,
            registrant,
            created_at,
            ledger,
        }
        .publish(&env);
    }

    pub fn exists(env: Env, request_hash: BytesN<32>) -> bool {
        let key = DataKey::Request(request_hash);
        let storage = env.storage().persistent();
        if !storage.has(&key) {
            return false;
        }

        storage.extend_ttl(&key, TTL_EXTENSION_THRESHOLD, TTL_EXTEND_TO);
        true
    }

    pub fn get(env: Env, request_hash: BytesN<32>) -> Option<Registration> {
        let key = DataKey::Request(request_hash);
        let storage = env.storage().persistent();
        let registration = storage.get(&key);
        if registration.is_some() {
            storage.extend_ttl(&key, TTL_EXTENSION_THRESHOLD, TTL_EXTEND_TO);
        }

        registration
    }
}

#[cfg(test)]
mod test {
    use super::{RegistryError, RequestRegistered, RequestRegistry, RequestRegistryClient};
    use soroban_sdk::{
        testutils::{Address as _, Events as _},
        Address, BytesN, Env, Event as _,
    };

    fn setup(env: &Env) -> (Address, super::RequestRegistryClient<'_>) {
        let contract_id = env.register(RequestRegistry, ());
        let client = RequestRegistryClient::new(&env, &contract_id);
        (contract_id, client)
    }

    fn hash(env: &Env, value: u8) -> BytesN<32> {
        BytesN::from_array(env, &[value; 32])
    }

    #[test]
    fn register_exists_and_get_return_saved_data() {
        let env = Env::default();
        let (contract_id, client) = setup(&env);
        let registrant = Address::generate(&env);
        let request_hash = hash(&env, 1);
        env.mock_all_auths();

        assert!(!client.exists(&request_hash));
        client.register(&registrant, &request_hash);
        assert_eq!(
            env.events().all(),
            [RequestRegistered {
                request_hash: request_hash.clone(),
                registrant: registrant.clone(),
                created_at: env.ledger().timestamp(),
                ledger: env.ledger().sequence(),
            }
            .to_xdr(&env, &contract_id)]
        );

        assert!(client.exists(&request_hash));

        let registration = client.get(&request_hash).unwrap();
        assert_eq!(registration.registrant, registrant);
        assert_eq!(registration.created_at, env.ledger().timestamp());
        assert_eq!(registration.ledger, env.ledger().sequence());
    }

    #[test]
    fn duplicate_registration_returns_typed_error() {
        let env = Env::default();
        let (_contract_id, client) = setup(&env);
        let registrant = Address::generate(&env);
        let request_hash = hash(&env, 2);
        env.mock_all_auths();
        client.register(&registrant, &request_hash);

        assert_eq!(
            client.try_register(&registrant, &request_hash),
            Err(Ok(RegistryError::AlreadyRegistered.into()))
        );
    }

    #[test]
    #[should_panic]
    fn registration_requires_authorization() {
        let env = Env::default();
        let (_contract_id, client) = setup(&env);
        let registrant = Address::generate(&env);
        client.register(&registrant, &hash(&env, 3));
    }

    #[test]
    fn distinct_hashes_have_distinct_registrations() {
        let env = Env::default();
        let (_contract_id, client) = setup(&env);
        let registrant = Address::generate(&env);
        let second_registrant = Address::generate(&env);
        let first_hash = hash(&env, 4);
        let second_hash = hash(&env, 5);
        env.mock_all_auths();

        client.register(&registrant, &first_hash);
        client.register(&second_registrant, &second_hash);

        assert!(client.exists(&first_hash));
        assert!(client.exists(&second_hash));
        assert_ne!(client.get(&first_hash), client.get(&second_hash));
    }
}
