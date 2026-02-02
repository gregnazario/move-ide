use std::net::IpAddr;
use std::sync::atomic::{AtomicUsize, Ordering};

use dashmap::DashMap;

pub struct RateLimiter {
    active_connections: DashMap<IpAddr, AtomicUsize>,
    max_per_ip: usize,
}

pub struct RateLimitGuard<'a> {
    ip: IpAddr,
    limiter: &'a RateLimiter,
}

impl RateLimiter {
    pub fn new(max_per_ip: usize) -> Self {
        RateLimiter {
            active_connections: DashMap::new(),
            max_per_ip,
        }
    }

    pub fn try_acquire(&self, ip: IpAddr) -> Result<RateLimitGuard<'_>, ()> {
        let counter = self
            .active_connections
            .entry(ip)
            .or_insert_with(|| AtomicUsize::new(0));

        let current = counter.fetch_add(1, Ordering::SeqCst);

        if current >= self.max_per_ip {
            counter.fetch_sub(1, Ordering::SeqCst);
            return Err(());
        }

        Ok(RateLimitGuard { ip, limiter: self })
    }

    fn release(&self, ip: IpAddr) {
        if let Some(counter) = self.active_connections.get(&ip) {
            counter.fetch_sub(1, Ordering::SeqCst);
        }
    }
}

impl Drop for RateLimitGuard<'_> {
    fn drop(&mut self) {
        self.limiter.release(self.ip);
    }
}
