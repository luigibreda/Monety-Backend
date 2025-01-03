import express from "express"
import {
  obterTodosUsuarios,
  obterUsuarioPorId,
  entrar,
  sair,
  registrar,
  atualizarUsuario,
  usuarioLogado,
  deleteUsuario
} from "../controller/UsuariosController.js"
import { verifyToken as verificaToken } from "../middlewares/verifyToken.js"
import { refreshToken as atualizarToken } from "../controller/refreshToken.js"

const router = express.Router()

/**
 * @swagger
 * tags:
 *   name: Usuarios
 *   description: Endpoints relacionados a usuários
 */

/**
 * @swagger
 * /usuarios:
 *   get:
 *     tags: [Usuarios]
 *     description: Retorna a lista de usuários
 *     responses:
 *       200:
 *         description: Lista de usuários
 */
router.get("/usuarios", obterTodosUsuarios)
router.get("/usuarios/:usuarioId", obterUsuarioPorId)
router.put("/usuarios/:usuarioId", verificaToken, atualizarUsuario)
router.delete("/usuarios/:usuarioId", verificaToken, deleteUsuario)

router.get("/auth/eu", verificaToken, usuarioLogado);
router.post("/auth/registrar", registrar)
router.post("/auth/entrar", entrar)
router.delete("/auth/sair", sair)
router.get("/token", atualizarToken)

export default router