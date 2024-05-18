import express from "express"
import {
  deleteArquivo,
  editArquivo,
  getAllArquivos,
  getArquivo,
  getUserArquivos,
  pausarDespausarArquivo,
  aprovarArquivo,
  reprovarArquivo,
  enviaArquivo,
  downloadArquivo
} from "../controller/ArquivoController.js"
import { verifyToken } from "../middlewares/verifyToken.js"
import multer from "multer"

const upload = multer({ dest: 'uploads/' }).any();

const router = express.Router()

router.get("/arquivos", verifyToken, getAllArquivos)
router.get("/:userId/arquivos", getUserArquivos)
router.get("/arquivos/:arquivoId", getArquivo)
// router.post("/:userId/arquivos", verifyToken, createArquivo)
router.put("/:userId/arquivos/:arquivoId", verifyToken, editArquivo)
router.delete("/arquivos/:arquivoId", verifyToken, deleteArquivo)
router.post("/arquivos/:arquivoId/pausarDespausarArquivo", verifyToken, pausarDespausarArquivo)
router.post("/arquivos/:arquivoId/aprovarArquivo", verifyToken, aprovarArquivo)
router.post("/arquivos/:arquivoId/reprovarArquivo", verifyToken, reprovarArquivo)


router.post("/arquivos/upload", verifyToken, upload, enviaArquivo)
router.get("/baixar/:arquivoId", downloadArquivo)

export default router