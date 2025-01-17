use anyhow::{Context, Result};
use reqwest::header::HeaderValue;
use reqwest::Response;
use std::collections::HashMap;
use std::time::{Duration, Instant};

#[derive(Debug, Deserialize)]
struct KeyResponse {
    keys: Vec<JwkKey>,
}

#[derive(Debug, Deserialize, Eq, PartialEq)]
pub struct JwkKey {
    pub e: String,
    pub alg: String,
    pub kty: String,
    pub kid: String,
    pub n: String,
}

pub struct JwkKeys {
    pub keys: HashMap<String, JwkKey>,
    pub created: Instant,
    pub validity: Duration,
}

impl JwkKeys {
    pub fn is_still_valid(&self, now: Instant) -> bool {
        self.created + self.validity > now
    }

    pub async fn fetch(jwk_url: &str, now: Instant) -> Result<JwkKeys> {
        let http_response = reqwest::get(jwk_url)
            .await
            .with_context(|| format!("Downloading {}", jwk_url))?;
        let max_age = get_max_age(&http_response).unwrap_or(FALLBACK_TIMEOUT);
        let result = http_response
            .json::<KeyResponse>()
            .await
            .context("Loading json body")?;

        let mut keys_hm = HashMap::new();
        for key in result.keys.into_iter() {
            keys_hm.insert(key.kid.clone(), key);
        }

        Ok(JwkKeys {
            keys: keys_hm,
            created: now,
            validity: max_age,
        })
    }
}

const FALLBACK_TIMEOUT: Duration = Duration::from_secs(60);

enum MaxAgeParseError {
    NoMaxAgeSpecified,
    NoCacheControlHeader,
    MaxAgeValueEmpty,
    NonNumericMaxAge,
}

// Determines the max age of an HTTP response
fn get_max_age(response: &Response) -> Result<Duration, MaxAgeParseError> {
    let headers = response.headers();
    let header = headers.get("Cache-Control");

    match header {
        Some(header_value) => parse_cache_control_header(header_value),
        None => Err(MaxAgeParseError::NoCacheControlHeader),
    }
}

fn parse_max_age_value(cache_control_value: &str) -> Result<Duration, MaxAgeParseError> {
    let tokens: Vec<&str> = cache_control_value.split(",").collect();
    for token in tokens {
        let key_value: Vec<&str> = token.split("=").map(|s| s.trim()).collect();
        let key = key_value.first().unwrap();
        let val = key_value.get(1);

        if String::from("max-age").eq(&key.to_lowercase()) {
            match val {
                Some(value) => {
                    return Ok(Duration::from_secs(
                        value
                            .parse()
                            .map_err(|_| MaxAgeParseError::NonNumericMaxAge)?,
                    ))
                }
                None => return Err(MaxAgeParseError::MaxAgeValueEmpty),
            }
        }
    }
    return Err(MaxAgeParseError::NoMaxAgeSpecified);
}

fn parse_cache_control_header(header_value: &HeaderValue) -> Result<Duration, MaxAgeParseError> {
    match header_value.to_str() {
        Ok(string_value) => parse_max_age_value(string_value),
        Err(_) => Err(MaxAgeParseError::NoCacheControlHeader),
    }
}
