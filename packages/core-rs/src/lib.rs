//! HyperFlow core placeholder crate.

/// Returns the current bootstrap version string.
pub fn bootstrap_version() -> &'static str {
    "0.1.0-bootstrap"
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exposes_bootstrap_version() {
        assert_eq!(bootstrap_version(), "0.1.0-bootstrap");
    }
}
