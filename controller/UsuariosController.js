import { PrismaClient } from "@prisma/client"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

const prisma = new PrismaClient()
export const obterTodosUsuarios = async (req, res) => {
  try {
    // Parâmetros de paginação
    const page = Number(req.query.page) || 0;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search_query || "";
    const offset = page * limit;

    // Contagem total de usuários
    const totalRows = await prisma.user.count({
      where: {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
          // Adicione outros campos conforme necessário
        ],
      },
    });

    // Cálculo do total de páginas
    const totalPage = Math.ceil(totalRows / limit);

    // Consulta para obter os usuários com paginação
    const users = await prisma.user.findMany({
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      where: {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
          // Adicione outros campos conforme necessário
        ],
      },
    });

    // Resposta com os dados paginados
    res.status(200).json({
      result: users,
      page,
      limit,
      totalRows,
      totalPage,
    });
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
};


export const usuarioLogado = async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1]; // Assume Bearer token
    if (!token) return res.sendStatus(401);

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    if (!user) return res.sendStatus(404);

    res.json(user);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
}

export const obterUsuarioPorId = async (req, res) => {
  try {
    const { usuarioId } = req.params;
    if (!usuarioId) {
      return res.status(400).json({ mensagem: "ID do usuário não fornecido" });
    }

    const usuario = await prisma.user.findUnique({
      where: { id: usuarioId }, // Certifique-se de que o ID é um número inteiro, se necessário
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    if (!usuario) {
      return res.status(404).json({ mensagem: "Usuário não encontrado" });
    }
    res.json(usuario);
  } catch (error) {
    console.error("Erro ao buscar usuário por ID:", error);
    res.status(500).json({ mensagem: "Erro interno do servidor" });
  }
  };

export const registrar = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body

    if (!name) return res.status(400).json({ message: "Nome é obrigatório."})
    if (!email) return res.status(400).json({ message: "Email é obrigatório."})
    if (!password) return res.status(400).json({ message: "Senha é obrigatório."})
    if (!confirmPassword) return res.status(400).json({ message: "Confirmação de senha é obrigatório." })
    if (password !== confirmPassword) return res.status(400).json({ message: "Senhas estão diferentes." })

    const isUserExist = await prisma.user.findFirst({
      where: {
        email
      }
    })
    if (isUserExist) return res.status(400).json({ message: "Email já está cadastrado." })

    const salt = await bcrypt.genSalt()
    const hashedPassword = await bcrypt.hash(password, salt)

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword
      }
    })

    res.status(201).json({ message: "Registro efetuado com sucesso."})
  } catch (error) {
    console.log(error)
  }
}

export const entrar = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email) return res.status(400).json({ message: "Email é obrigatório."})
    if (!password) return res.status(400).json({ message: "Senha é obrigatório." })
    
    const user = await prisma.user.findFirst({
      where: {
        email
      }
    })
    if (!user) return res.status(400).json({ message: "Email não encontrado." })

    const isMatched = await bcrypt.compare(password, user.password)
    if (!isMatched) return res.status(400).json({ message: "Password está incorreto." })

    const userId = user.id
    const userEmail = user.email
    const userName = user.name
    const isAdmin = user.isAdmin

    const token = jwt.sign({ userId, userEmail, userName, isAdmin }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: '2h'
    })
    const refreshToken = jwt.sign({ userId, userEmail, userName, isAdmin }, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: '1d'
    })

    await prisma.user.update({
      where: {
        id: userId
      },
      data: {
        refresh_token: refreshToken
      } 
    })

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true, // Somente quando estiver em uma conexão HTTPS
      sameSite: 'none', // Necessário para que os cookies funcionem em um ambiente de terceiros
      maxAge: 24 * 60 * 60 * 1000
    })

    res.status(200).json({ token })
  } catch (error) {
    console.log(error)
  }
}

export const atualizarUsuario = async (req, res) => {
  try {
    const { name, email } = req.body
    const refreshToken = req.cookies.refreshToken

    if (!refreshToken) return res.sendStatus(401) 
    if (!name) return res.status(400).json({ message: "Nome é obrigatório."})
    if (!email) return res.status(400).json({ message: "Email é obrigatório." })

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
      if (err) return res.sendStatus(403)
    })

    const user = await prisma.user.findUnique({
      where: {
        id: req.params.usuarioId
      }
    })

    if (!user) return res.sendStatus(403)
    if (user.refresh_token !== refreshToken) return res.sendStatus(403)

    await prisma.user.update({
      where: {
        id: req.params.usuarioId
      },
      data: {
        name: name,
        email: email
      }
    })

    res.status(200).json({ message: "Usuário atualizado com sucesso."})
  } catch (error) {
    console.log(error)
  }
}

export const sair = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken

    if (!refreshToken) return res.sendStatus(204)

    const user = await prisma.user.findFirst({
      where: {
        refresh_token: refreshToken
      }
    })

    if (!user) return res.sendStatus(204)

    await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        refresh_token: null
      }
    })

    res.clearCookie("refreshToken")
    res.sendStatus(200)
  } catch (error) {
    console.log(error)
  }
}

// DELETE usuário
export const deleteUsuario = async (req, res) => {
  try {
    console.log("logs luigi:");
    console.log(req);
    console.log(req.cookies);
    console.log(req.cookies.refreshToken);
    const refreshToken = req.cookies.refreshToken

    if (!refreshToken) return res.sendStatus(401)

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
      if (err) return res.sendStatus(403)
    })
    
    const { usuarioId } = req.params

    const user = await prisma.user.findUnique({
      where: {
        id: req.usuario.userId  
      }
    })

    if (!user) return res.sendStatus(404)
    if (user.refresh_token !== refreshToken) return res.sendStatus(403)

    if (user.isAdmin == false) return res.sendStatus(403);
    
    if (user.id == usuarioId) return res.sendStatus(403);

    const usuario = await prisma.user.findUnique({
      where: {
        id: usuarioId  
      }
    })

    if (!usuario) return res.sendStatus(404)

    const usuarioDeletado = await prisma.user.delete({
      where: {
        id: usuarioId  
      }
    })

    res.status(200).json({
      message: "Usuário deletado",
      data: usuarioDeletado
    })
  } catch (error) {
    console.log(error)
    res.sendStatus(400)
  }
}