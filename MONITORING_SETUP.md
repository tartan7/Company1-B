# Prometheus and Grafana Monitoring Setup

## Overview

This document describes the complete monitoring infrastructure for all 6 MVP themes using Prometheus for metrics collection and Grafana for visualization and alerting.

## Architecture

```
┌─────────────────────────────────┐
│     Grafana Dashboard           │
│   (Visualization & Alerting)    │
│   - Master Overview             │
│   - Per-Theme Dashboards        │
│   - Alert Rules                 │
└──────────────┬──────────────────┘
               │ (queries)
               ▼
┌─────────────────────────────────┐
│   Prometheus Server             │
│ (Time-Series Database & Scrape) │
│   - 15s scrape interval         │
│   - 30-day retention (default)  │
└──────────────┬──────────────────┘
               │ (scrapes)
      ┌────────┼────────┬──────────┬──────────┬────────┐
      ▼        ▼        ▼          ▼          ▼        ▼
   BS-03    WK-01    BS-02      T-01       F-01     A-01
  Service  Service  Service   Service    Service   Service
```

## Services Monitored

| Theme | Service | Port | Description |
|-------|---------|------|-------------|
| BS-03 | financial-statements | 3001 | Cash flow forecasting and balance sheet generation |
| WK-01 | uptime-monitor | 3002 | Platform health and uptime monitoring |
| BS-02 | invoice-generator-jp | 3004 | Invoice generation and management |
| T-01 | tourism-booking-api | 3005 | Tourism experience booking system |
| F-01 | seasonal-labor-scheduler | 3003 | Seasonal labor scheduling |
| A-01 | faq-bot | 3006 | FAQ and help bot |

## Quick Start

### Prerequisites
- Docker and Docker Compose
- All 6 theme services running with `/metrics` endpoints enabled

### Starting Monitoring Stack

```bash
# Start Prometheus and Grafana
docker-compose -f docker-compose.monitoring.yml up -d

# Verify services are running
docker-compose -f docker-compose.monitoring.yml ps
```

### Accessing Dashboards

- **Grafana**: http://localhost:3000 (default credentials: admin/admin)
- **Prometheus**: http://localhost:9090

## Metrics Exposed

### Request Metrics (HTTP)
- **http_request_duration_seconds** (Histogram)
  - Labels: method, route, status_code
  - Buckets: 0.01s, 0.05s, 0.1s, 0.25s, 0.5s, 1s, 2s, 5s
  - Measures: p50, p95, p99 latencies

- **http_requests_total** (Counter)
  - Labels: method, route, status_code
  - Measures: total requests per endpoint

- **http_request_errors_total** (Counter)
  - Labels: method, route, status_code
  - Measures: total errors (4xx, 5xx status codes)

### Database Metrics
- **db_query_duration_seconds** (Histogram)
  - Labels: operation, table
  - Buckets: 0.001s, 0.005s, 0.01s, 0.05s, 0.1s, 0.5s, 1s, 2s
  - Measures: database query performance

- **db_connections_active** (Gauge)
  - Labels: pool
  - Measures: current active database connections

### Resource Metrics
- **nodejs_heap_size_bytes** (Gauge)
  - Measures: Node.js heap memory usage
  - Alert threshold: >500MB

- **process_cpu_seconds_total** (Counter)
  - Measures: CPU time consumed by the process

## Dashboards Available

### 1. Master Overview Dashboard
File: `dashboards/overview.json`

Shows aggregated metrics across all 6 services:
- Throughput (requests/sec)
- Latency distribution (p50, p95, p99)
- Error rates
- Database query performance

### 2. Per-Theme Dashboards

Each theme has a dedicated dashboard showing:
- Service throughput
- Request latency percentiles (p50, p95, p99)
- Error rate with thresholds
- Database query latency

**Available Dashboards:**
- BS-03: Financial Statements (`bs-03-financial-statements.json`)
- WK-01: Scallop Hub Platform (`wk-01-uptime-monitor.json`)
- BS-02: Invoice Generator (`bs-02-invoice-generator-jp.json`)
- T-01: Tourism Booking (`t-01-tourism-booking-api.json`)
- F-01: Seasonal Labor Scheduler (`f-01-seasonal-labor-scheduler.json`)
- A-01: FAQ Bot (`a-01-faq-bot.json`)

## Alerting Rules

File: `alert_rules.yml`

### Active Alerts

1. **HighErrorRate**
   - Trigger: Error rate > 1% for 5 minutes
   - Severity: warning
   - Action: Check service logs and error traces

2. **HighLatency**
   - Trigger: P99 latency > 500ms for 5 minutes
   - Severity: warning
   - Action: Check resource utilization and database performance

3. **LowThroughput**
   - Trigger: Request rate < 1 req/sec for 10 minutes
   - Severity: warning
   - Action: Check service health and connectivity

4. **HighDatabaseLatency**
   - Trigger: P95 DB latency > 1 second for 5 minutes
   - Severity: warning
   - Action: Check database indexes and query plans

5. **HighMemoryUsage**
   - Trigger: Heap size > 500MB for 5 minutes
   - Severity: warning
   - Action: Check for memory leaks or excessive object creation

## Configuration Files

### prometheus.yml
Main Prometheus configuration:
- Global scrape interval: 15 seconds
- Evaluation interval: 15 seconds
- Scrape targets for all 6 services
- Metrics path: `/metrics`

### grafana-datasources.yml
Grafana data source configuration:
- Prometheus as default data source
- URL: http://prometheus:9090

### grafana-dashboards-provider.yml
Grafana dashboard provisioning:
- Auto-loads dashboards from `/etc/grafana/provisioning/dashboards`
- Updates every 10 seconds

## Performance Baseline

Before load testing, establish baselines for each service:

```bash
# Query baseline metrics
curl http://localhost:9090/api/v1/query \
  -d 'query=rate(http_requests_total[5m])'

# Export baseline snapshot
curl http://localhost:3000/api/snapshots \
  -X POST \
  -H "Authorization: Bearer $GRAFANA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dashboard":{},"expires":0}'
```

## Load Testing Integration

1. **Pre-test**: Capture baseline metrics for all services
2. **During test**: Monitor dashboards in real-time
3. **Post-test**: Export metrics and compare with baseline
4. **Analysis**: Identify bottlenecks and performance degradation

## Troubleshooting

### Prometheus not scraping metrics
1. Check service is running: `curl localhost:3001/metrics`
2. Verify Prometheus target status: http://localhost:9090/targets
3. Check network connectivity between Prometheus and services

### Grafana dashboards showing no data
1. Verify Prometheus is scraping: http://localhost:9090/api/v1/labels
2. Check datasource connection in Grafana
3. Verify PromQL queries use correct job names

### High memory/CPU usage
1. Reduce scrape interval in prometheus.yml
2. Increase metric retention period
3. Check for excessive cardinality in metrics (high label combinations)

## Maintenance

### Daily Tasks
- Monitor alert dashboard
- Review error rates and latency trends
- Check database connection pools

### Weekly Tasks
- Review alert threshold tuning
- Archive old metrics
- Performance baseline comparison

### Monthly Tasks
- Backup Prometheus data
- Update alert rules based on learnings
- Capacity planning review

## Integration with Load Testing

The monitoring setup is specifically designed to support load testing validation:

1. **Metric Collection**: Prometheus collects all metrics during load tests
2. **Real-time Monitoring**: Grafana dashboards show live metrics
3. **Alert Triggers**: Alerts notify of performance degradation
4. **Baseline Comparison**: Historical data for regression detection

## Next Steps

1. ✅ Deploy Prometheus and Grafana containers
2. ✅ Configure scrape targets for all 6 services
3. ✅ Create operational dashboards
4. ✅ Set up alert rules
5. ⬜ Run baseline metrics collection
6. ⬜ Perform load testing with monitoring
7. ⬜ Create performance report with metrics data

## Support

For issues or questions about the monitoring setup:
1. Check this documentation
2. Review Prometheus logs: `docker-compose logs prometheus`
3. Review Grafana logs: `docker-compose logs grafana`
4. Consult Prometheus/Grafana official documentation
