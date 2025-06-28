import client from 'prom-client';
import { Express } from 'express';

// Create a Registry to register the metrics
export const register = new client.Registry();

// Metrics
export const boardsCreated = new client.Counter({
  name: 'boards_created_total',
  help: 'Total number of boards created',
});
export const tasksCreated = new client.Counter({
  name: 'tasks_created_total',
  help: 'Total number of tasks created',
});
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
});

// Register metrics
register.registerMetric(boardsCreated);
register.registerMetric(tasksCreated);
register.registerMetric(httpRequestDuration);

// Expose /metrics endpoint
export function setupMetrics(app: Express) {
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });
}