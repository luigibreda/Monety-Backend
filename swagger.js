// swagger.js
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// Configuração do Swagger
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Monety Backend - API',
    version: '1.0.0',
    description: 'Swagger da API do Monety Backend',
  },
  servers: [
    {
      url: `https://monety-backend.vercel.app`,
      description: 'Servidor Vercel',
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./routes/*.js'], // Caminho para seus arquivos de rotas
};

const swaggerSpec = swaggerJSDoc(options);

// Middleware do Swagger
const swaggerDocs = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};

export default swaggerDocs;
