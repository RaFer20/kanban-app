import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Kanban Board Service API',
      version: '1.0.0',
      description: 'API documentation for the Kanban Board microservice',
    },
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // Scan for JSDoc comments
};

export const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}