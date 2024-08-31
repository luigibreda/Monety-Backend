import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import UsuariosRoute from './routes/UsuariosRoute.js';
import ArquivosRoute from './routes/ArquivosRoute.js';
import swaggerDocs from './swagger.js';

dotenv.config();

const app = express();

// Lista de domínios permitidos
const allowedOrigins = [
  "https://monety.vercel.app",
  "https://monetyapp.com.br",
  "https://monety.vercel.app/",
  "http://monety.vercel.app/",
  "http://localhost"
];

// Middlewares
app.use(cors({
  origin: (origin, callback) => {
    // Permite requisições sem origem (como as feitas por ferramentas de teste e scripts locais)
    if (!origin) return callback(null, true);
    // Verifica se a origem da requisição está na lista de domínios permitidos
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"] // Permitindo todos os métodos necessários
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use(UsuariosRoute);
app.use(ArquivosRoute);

// Swagger
swaggerDocs(app);

app.listen(process.env.PORT, () => console.log("Server is running... port: " + process.env.PORT));
