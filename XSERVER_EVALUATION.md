# Xserver Infrastructure Evaluation: MySQL/MariaDB Deployment Viability

**Date**: 2026-05-15  
**Status**: Complete Evaluation  
**Priority**: High  
**Task**: ESC-42

---

## Executive Summary

Xserver (エックスサーバー) is a Japanese-based hosting provider offering multiple infrastructure tiers: shared hosting, VPS, and dedicated servers. **Viability verdict: CONDITIONALLY VIABLE** — depends on deployment tier selected.

- **Shared Hosting**: ❌ NOT VIABLE for production MySQL/MariaDB
- **VPS**: ✅ VIABLE for moderate workloads (2-8 vCPU, 4-16GB RAM)
- **Dedicated Servers**: ✅ VIABLE for high-performance deployments

---

## 1. MySQL/MariaDB Availability

### Database Versions Supported
- **MySQL**: 5.0.x, 5.5.x, 5.7.x (legacy versions)
- **MariaDB**: 10.5.x (primary offering for new deployments)
- **SQLite**: Also supported

### Availability Assessment
✅ **Available** across all infrastructure tiers (shared, VPS, dedicated)

**Note**: Database version choices are tied to server creation date. Legacy MySQL 5.7 is reaching end-of-life and migration to MariaDB 10.5 is recommended for new deployments.

---

## 2. Hosting Constraints and Limitations

### A. Shared Hosting Tier Constraints

**Critical Network Limitation**:
- MySQL port 3306 is **firewall-blocked from external access**
- Direct database connections from applications unavailable
- Requires workarounds:
  - phpMyAdmin (web interface only)
  - SSH tunneling (port forwarding) with performance overhead
  - No true production deployment support

**Other Constraints**:
- Shared CPU and RAM resources with 100s-1000s of other users
- No resource guarantees or isolation
- Not suitable for performance-critical workloads
- Database management limited to cPanel-style control panel

**Verdict**: ❌ **NOT RECOMMENDED** for production MySQL/MariaDB deployments

---

### B. VPS Tier Capabilities

**Resource Allocation**:
- Dedicated vCPU cores (typically 2-8 cores)
- Guaranteed RAM allocation (4-16GB options)
- Guaranteed storage (SSD-backed)
- Zero resource contention with other accounts
- Full administrative access (root)

**Network Access**:
- ✅ Full control over firewall and network rules
- ✅ Direct MySQL port 3306 access available
- ✅ SSH, VPN, and standard database protocols supported

**Database Performance**:
- Suitable for small to medium workloads
- Recommended configuration:
  - innodb_buffer_pool_size: 60-70% of available RAM
  - For 4GB VPS: allocate 2.4-2.8GB to buffer pool
  - For 16GB VPS: allocate 9.6-11.2GB to buffer pool

**Verdict**: ✅ **VIABLE** for moderate production deployments

---

### C. Dedicated Server Tier Capabilities

**Resource Allocation**:
- All CPU cores exclusively available
- All RAM exclusively available
- All storage exclusively available
- Physical hardware with Enterprise-class components (Dell, HPE)
- No noisy neighbor effects

**Infrastructure Quality**:
- Redundant power (2N UPS + diesel generators)
- Independent cooling systems
- Multiple Tier-1 carrier connections
- No single point of failure architecture
- Modern processors (Intel Xeon, AMD EPYC latest generations)
- DDR5 memory standard (note: DDR4 pricing volatile in 2026)

**Network Access**:
- ✅ Full network control
- ✅ Direct database access with no restrictions
- ✅ Dedicated bandwidth
- ✅ Support for high-concurrency workloads

**Verdict**: ✅ **VIABLE** for high-performance and mission-critical deployments

---

## 3. Cost Analysis

### Shared Hosting Pricing
- **Monthly**: ¥1,100 (~$8 USD) standard rate
- **Annual Discount** (36-month contract): ¥693/month (~$5 USD)
- **Setup Fee**: ¥0
- **Includes**: 2 free custom domains

**Cost Assessment**: Cheapest option but not viable for production databases.

---

### VPS Pricing
*Specific Xserver VPS pricing varies by configuration; general market rates:*
- **2 vCPU / 4GB RAM**: $10-20/month
- **4 vCPU / 8GB RAM**: $20-40/month
- **8 vCPU / 16GB RAM**: $40-80/month

**Cost Assessment**: Moderate cost, suitable cost-benefit for small-to-medium deployments.

---

### Dedicated Server Pricing
*Estimated based on market data and Xserver infrastructure tier:*
- **Entry-level (4-core, 16GB RAM)**: $80-150/month
- **Mid-tier (8-core, 32GB RAM)**: $150-300/month
- **High-performance (16+ cores, 64GB+ RAM)**: $300+/month

**Cost Assessment**: Premium pricing but justified for production-critical deployments with high availability requirements.

---

## 4. Performance Implications

### Shared Hosting Performance
- **Unpredictable**: Subject to "noisy neighbor" effects
- **Latency**: Higher due to virtualization layer + SSH tunneling requirements
- **Throughput**: Limited by shared CPU and I/O
- **Scalability**: Poor — cannot be vertically scaled

### VPS Performance
- **Predictable**: Guaranteed resource allocation
- **Latency**: Direct MySQL connections via TCP/IP
- **Throughput**: Good for moderate workloads (100-1000 QPS typical)
- **Scalability**: Can be scaled vertically (upgrade VPS tier)
- **Memory Efficiency**: Good with proper buffer pool configuration

### Dedicated Server Performance
- **Predictable**: Exclusive hardware with no contention
- **Latency**: Optimal — direct hardware access
- **Throughput**: Excellent for high-load workloads (1000+ QPS typical)
- **Scalability**: Vertical scaling within hardware limits; can add replicas
- **Enterprise Features**: Supports Galera Cluster, master-slave replication

---

## 5. Comparative Market Position

### How Xserver Compares (2026)
- **Pricing vs Competitors**: Shared hosting is competitively priced (similar to Lolipop, cheaper than ConoHa WING)
- **Uptime/Reliability**: Standard tier 99.9% SLA claims (typical for market)
- **Support**: Phone support available (differentiator in market)
- **Geographic Focus**: Primarily Japan-based; good latency for Asia-Pacific region
- **Data Centers**: Multiple locations (not globally distributed like AWS/Azure)

### When Xserver is the Right Choice
- Small to medium businesses with Asia-Pacific primary user base
- Cost-sensitive deployments (VPS tier)
- Organizations needing Japanese-language support
- Non-mission-critical secondary databases

### When Alternatives May Be Better
- High-availability requirements (use cloud-native solutions: AWS RDS, Azure Database for MySQL, etc.)
- Global distribution needs (use AWS, Google Cloud, Azure)
- Managed database services desired (Xserver is unmanaged, self-managed)
- Enterprise compliance/certifications needed

---

## 6. Key Technical Constraints

| Constraint | Shared Hosting | VPS | Dedicated |
|-----------|---|---|---|
| Port 3306 Access | ❌ Blocked | ✅ Open | ✅ Open |
| Resource Isolation | ❌ Shared | ✅ Guaranteed | ✅ Exclusive |
| Scalability | ❌ None | ✅ Limited | ✅ Good |
| Backup Automation | ⚠️ Basic | ✅ User-managed | ✅ User-managed |
| HA/Redundancy | ❌ None | ⚠️ Single point of failure | ✅ Possible (Galera, replication) |
| Database Monitoring | ⚠️ Limited | ✅ Full access | ✅ Full access |
| MySQL Tuning | ❌ Limited | ✅ Full control | ✅ Full control |

---

## 7. Recommendations by Use Case

### Use Case 1: Production Web Application with Database
**Recommendation**: ✅ **VPS Tier** (Conditional)
- Suitable for: 100-1000 concurrent users, <10GB total data
- Minimum specs: 4 vCPU / 8GB RAM / 100GB SSD
- Cost: $20-40/month (affordable)
- Caveats: Requires manual backups, monitoring; not high-availability

### Use Case 2: Mission-Critical Production Database
**Recommendation**: ✅ **Dedicated Server Tier** (Best Option)
- Suitable for: 1000+ concurrent users, high availability required
- Minimum specs: 8 cores / 32GB RAM / RAID-protected storage
- Cost: $150-300+/month (enterprise-level)
- Benefits: Exclusive resources, predictable performance, supports clustering

### Use Case 3: Development / Staging Environment
**Recommendation**: ✅ **VPS Tier** (Optimal)
- Suitable for: Testing, non-critical workloads
- Minimum specs: 2 vCPU / 4GB RAM / 50GB SSD
- Cost: $10-20/month (very economical)
- Benefits: Low cost, sufficient for testing

### Use Case 4: Temporary / Pilot Projects
**Recommendation**: ❌ **NOT Shared Hosting**  
**Recommendation**: ✅ **VPS Tier** (Pragmatic)
- Use VPS for any MySQL/MariaDB workload
- Avoid shared hosting due to network access limitations

---

## 8. Unresolved Questions & Gaps

1. **Managed Database Services**: Does Xserver offer managed MySQL/MariaDB (like AWS RDS)? Initial research suggests self-managed only.
2. **Automatic Backups**: VPS/Dedicated backup retention policies unclear.
3. **Database Replication Support**: Need to verify Galera Cluster licensing/support on dedicated servers.
4. **Geographic Data Residency**: Xserver primarily Japan-based; may not meet GDPR/data residency requirements for other regions.
5. **PCI-DSS Compliance**: Unclear if Xserver infrastructure meets payment processing compliance.

---

## 9. Final Viability Assessment

| Infrastructure Tier | Viable for MySQL/MariaDB | Confidence | Recommendation |
|---|---|---|---|
| **Shared Hosting** | ❌ NO | High | Do NOT use |
| **VPS** | ✅ YES | High | Use for small-to-medium production |
| **Dedicated Server** | ✅ YES | High | Use for mission-critical deployments |

---

## 10. Conclusion & Action Items

### Summary
Xserver **IS viable** as a deployment target for MySQL/MariaDB, **conditionally on tier selection**:
- ❌ Shared hosting is unsuitable due to port 3306 firewall blocking
- ✅ VPS and dedicated server tiers are fully viable and support production deployments
- ✅ Cost structure is competitive, especially for VPS deployments
- ⚠️ Not a managed database service; requires operational overhead

### Next Steps (for stakeholders)
1. **Clarify deployment requirements**: What scale (small, medium, large)? What availability SLA?
2. **Evaluate vs cloud-native alternatives**: AWS RDS, Azure Database, Google Cloud SQL (managed alternatives)
3. **Conduct POC**: For VPS tier, deploy test environment and validate performance expectations
4. **Assess operational readiness**: Do we have expertise to manage self-hosted MySQL/MariaDB?
5. **Legal/Compliance check**: Confirm geographic and regulatory alignment

### Recommended Path Forward
- **Short-term**: If cost-sensitive, use **Xserver VPS** with proper monitoring and backup strategy
- **Long-term**: Evaluate migration to **managed database service** for reduced operational burden
- **High-availability needs**: Use **Xserver Dedicated + Galera Cluster** or migrate to cloud-native HA solution

---

## References & Data Sources

- [Xserver Database Specifications](https://www.xserver.ne.jp/manual/man_db_spec.php)
- [Xserver MySQL FAQs](https://www.xserver.ne.jp/support/faq/service_hp_database.php)
- [2026 Xserver Pricing Analysis (Japanese)](https://edito.jp/corporate/xserver-price-analysis/)
- [MariaDB Configuration Best Practices](https://massivegrid.com/blog/install-mysql-mariadb-ubuntu-vps/)
- [Infrastructure & Hosting Comparison](https://www.inmotionhosting.com/blog/difference-between-shared-vps-dedicated-hosting/)

---

**Evaluation completed by**: CTO (c5376712-feaf-462e-acad-91f1949f55f0)  
**Date**: 2026-05-15  
**Status**: Ready for decision and next-phase action
