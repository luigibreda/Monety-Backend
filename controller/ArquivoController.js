import { PrismaClient } from "@prisma/client"
import jwt from "jsonwebtoken"
import fs from "fs"
import cache from "memory-cache";

const prisma = new PrismaClient()
const CACHE_TTL_1H = 60 * 60 * 1000; // 1 hora
const CACHE_TTL = 1 * 5 * 1000; // 5 segundos


// Função para buscar um único arquivo pelo ID - CACHE
export const getArquivo = async (req, res) => {
  try {
    const { arquivoId } = req.params;

    // Gerar uma chave de cache com base no ID do arquivo
    const cacheKey = `getArquivo:${arquivoId}`;

    // Verificar se os dados estão em cache
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      // Se os dados estiverem em cache, retornar os dados em cache
      return res.status(200).json(cachedData);
    }

    // Se os dados não estiverem em cache, buscar os dados do banco de dados
    const arquivo = await prisma.arquivos.findUnique({
      where: {
        id: arquivoId
      }
    });

    if (!arquivo) {
      return res.status(404).json({ message: "Arquivo não encontrado." });
    }

    // Armazenar os dados em cache
    cache.put(cacheKey, arquivo, CACHE_TTL);

    // Retornar os dados
    res.status(200).json(arquivo);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
};

// Função para buscar todos os arquivos do usuário, se for admin, de todos. - CACHE
export const getAllArquivos = async (req, res) => {
  try {
    const page = Number(req.query.page) || 0;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search_query || "";

    // Gerar uma chave de cache com base nos parâmetros da solicitação
    const cacheKey = `getAllArquivos:${page}:${limit}:${search}`;

    // Verificar se os dados estão em cache
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      // Se os dados estiverem em cache, retornar os dados em cache
      return res.status(200).json(cachedData);
    }

    // Se os dados não estiverem em cache, buscar os dados do banco de dados
    const user = await prisma.user.findUnique({
      where: {
        id: req.usuario.userId
      }
    });

    let totalRows, totalPage, result;

    if (user.isAdmin) {
      // Lógica para administradores
      totalRows = await prisma.arquivos.count({
        where: {
          nome: {
            contains: search,
            mode: 'insensitive'
          }
        }
      });

      totalPage = Math.ceil(totalRows / limit);

      result = await prisma.arquivos.findMany({
        skip: page * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        where: {
          nome: {
            contains: search,
            mode: 'insensitive'
          }
        }
      });
    } else {
      // Lógica para usuários não administradores
      const userId = req.usuario.userId;

      totalRows = await prisma.arquivos.count({
        where: {
          nome: {
            contains: search
          },
          userId: userId
        }
      });

      totalPage = Math.ceil(totalRows / limit);

      result = await prisma.arquivos.findMany({
        skip: page * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        where: {
          nome: {
            contains: search
          },
          userId: userId
        }
      });
    }

    // Armazenar os dados em cache
    cache.put(cacheKey, {
      result,
      page,
      limit,
      totalRows,
      totalPage
    }, CACHE_TTL);

    // Retornar os dados
    res.status(200).json({
      result,
      page,
      limit,
      totalRows,
      totalPage
    });
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
}

export const getUserArquivos = async (req, res) => {
  try {
    const userId = req.params.arquivoId
    const page = Number(req.query.page) || 0
    const limit = Number(req.query.limit) || 5
    const search = req.query.search_query || ""
    const offset = page * limit
    const totalRows = await prisma.arquivos.count({
      where: {
        userId,
        nome: {
          contains: search
        }
      }
    })
    const totalPage = Math.ceil(totalRows / limit)
    const result = await prisma.arquivos.findMany({
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      where: {
        userId,
        nome: {
          contains: search
        }
      }
    })

    res.json({
      result,
      page,
      limit,
      totalRows,
      totalPage
    })
  } catch (error) {
    console.log(error)
  }
}

export const editArquivo = async (req, res) => {
  try {
    const { name, price } = req.body
    const refreshToken = req.cookies.refreshToken

    if (!refreshToken) return res.sendStatus(401)
    if (!name) return res.status(400).json({ message: "Nome Obrigatório" })
    if (!price) return res.status(400).json({ message: "Preço Obrigatório" })

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
      if (err) return res.sendStatus(403)
    })

    const { userId, arquivoId } = req.params

    const user = await prisma.user.findUnique({
      where: {
        id: userId
      }
    })

    if (!user) return res.sendStatus(404)
    if (user.refresh_token !== refreshToken) return res.sendStatus(403)

    const isArquivoExist = await prisma.arquivos.findUnique({
      where: {
        id: Number(arquivoId),
        userId
      }
    })

    if (!isArquivoExist) return res.sendStatus(404)

    const arquivo = await prisma.arquivos.update({
      where: {
        id: Number(arquivoId)
      },
      data: {
        name,
        price: Number(price)
      }
    })

    res.status(201).json(arquivo)
  } catch (error) {
    console.log(error)
    res.sendStatus(400)
  }
}

export const pausarDespausarArquivo = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) return res.sendStatus(401);

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
      if (err) return res.sendStatus(403);
    });

    const { arquivoId } = req.params;

    const user = await prisma.user.findUnique({
      where: {
        id: req.usuario.userId
      }
    });

    if (!user) return res.sendStatus(404);
    if (user.refresh_token !== refreshToken) return res.sendStatus(403);

    const isArquivoExist = await prisma.arquivos.findUnique({
      where: {
        id: arquivoId
      }
    });

    if (!isArquivoExist) return res.sendStatus(404);

    // Alterar o estado do arquivo entre 1 e 3
    const updatedArquivo = await prisma.arquivos.update({
      where: {
        id: arquivoId,
        userId: req.usuario.userId
      },
      data: {
        estado: isArquivoExist.estado === 0 ? 3 : 0
      }
    });

    res.status(200).json({
      message: "Estado do arquivo modificado com sucesso",
      data: updatedArquivo
    });
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
}

export const aprovarArquivo = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) return res.sendStatus(401);

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
      if (err) return res.sendStatus(403);
    });

    const { arquivoId } = req.params;

    const user = await prisma.user.findUnique({
      where: {
        id: req.usuario.userId
      }
    });

    if (!user) return res.sendStatus(404);
    if (user.refresh_token !== refreshToken) return res.sendStatus(403);

    const isArquivoExist = await prisma.arquivos.findUnique({
      where: {
        id: arquivoId
      }
    });

    if (!isArquivoExist) return res.sendStatus(404);

    // Alterar o estado do arquivo para 2 (aprovado)
    const updatedArquivo = await prisma.arquivos.update({
      where: {
        id: arquivoId,
        userId: req.usuario.userId
      },
      data: {
        estado: 2
      }
    });

    res.status(200).json({
      message: "Arquivo aprovado com sucesso",
      data: updatedArquivo
    });
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
}

export const reprovarArquivo = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) return res.sendStatus(401);

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
      if (err) return res.sendStatus(403);
    });

    const { arquivoId } = req.params;

    const user = await prisma.user.findUnique({
      where: {
        id: req.usuario.userId
      }
    });

    if (!user) return res.sendStatus(404);
    if (user.refresh_token !== refreshToken) return res.sendStatus(403);

    const isArquivoExist = await prisma.arquivos.findUnique({
      where: {
        id: arquivoId
      }
    });

    if (!isArquivoExist) return res.sendStatus(404);

    // Alterar o estado do arquivo para 1 (reprovado)
    const updatedArquivo = await prisma.arquivos.update({
      where: {
        id: arquivoId,
        userId: req.usuario.userId
      },
      data: {
        estado: 1
      }
    });

    res.status(200).json({
      message: "Arquivo reprovado com sucesso",
      data: updatedArquivo
    });
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
}

export const deleteArquivo = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken

    if (!refreshToken) return res.sendStatus(401)

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
      if (err) return res.sendStatus(403)
    })

    const { arquivoId } = req.params

    const user = await prisma.user.findUnique({
      where: {
        id: req.usuario.userId
      }
    })

    if (!user) return res.sendStatus(404)
    if (user.refresh_token !== refreshToken) return res.sendStatus(403)

    const isArquivoExist = await prisma.arquivos.findUnique({
      where: {
        id: arquivoId,
        userId: req.usuario.userId
      }
    })

    if (!isArquivoExist) return res.sendStatus(404)

    const deletedArquivo = await prisma.arquivos.delete({
      where: {
        id: arquivoId,
        userId: req.usuario.userId
      }
    })

    res.status(200).json({
      message: "Arquivo deletado",
      data: deletedArquivo
    })
  } catch (error) {
    console.log(error)
    res.sendStatus(400)
  }
}

export const enviaArquivo = async (req, res) => {
  try {

    const userId = req.usuario.userId;


        // Verifica se os arquivos foram enviados
        if (!req.files || req.files.length === 0) {
          // return res.status(400).json({ message: "Arquivo é obrigatório" });    // TODO: DESCOMENTAR EM PROD

          // Se nenhum arquivo for enviado, salve um arquivo em branco
          const arquivo = await prisma.arquivos.create({
            data: {
              nome: "Arquivo em Branco",
              path: "uploads\\arquivo_mock", 
              filename: "c0b34bf13c609f5d1b8d649329fdf916", 
              userId: userId,
              tipo: "application/octet-stream", 
              tamanho: "0" 
            }
          });
    
          return res.status(201).json(arquivo);
        }
    

    // Extrai o primeiro arquivo da lista de arquivos
    const file = req.files[0];

    // Extrai as informações do arquivo
    const { originalname, filename, path } = file;

    // Salva o arquivo no banco de dados
    const arquivo = await prisma.arquivos.create({
      data: {
        nome: originalname,
        path: path,
        filename: filename,
        userId: userId,
        tipo: file.mimetype,
        tamanho: String(file.size)
      }
    });

    res.status(201).json(arquivo);
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
};



// Função para baixar um arquivo específico - CACHE
export const downloadArquivo = async (req, res) => {
  try {
    const arquivoId = req.params.arquivoId;

    // Gerar uma chave de cache com base no ID do arquivo
    const cacheKey = `downloadArquivo:${arquivoId}`;

    // Verificar se os dados estão em cache
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      // Se os dados estiverem em cache, enviar o arquivo como resposta
      return res.end(cachedData, 'binary');
    }

    // Encontra o arquivo pelo ID
    const arquivo = await prisma.arquivos.findUnique({
      where: {
        id: arquivoId
      }
    });

    if (!arquivo) {
      return res.status(404).json({ message: "Arquivo não encontrado." });
    }

    // Define o caminho do arquivo
    const filePath = arquivo.path;

    // Verifica se o arquivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Arquivo não encontrado." });
    }

    // Lê o arquivo do sistema de arquivos
    const fileData = fs.readFileSync(filePath);

    // Armazena os dados do arquivo em cache
    cache.put(cacheKey, fileData, CACHE_TTL_1H);

    // Define o cabeçalho de resposta para o download do arquivo
    res.setHeader("Content-Disposition", `attachment; filename=${arquivo.nome}`);
    res.setHeader("Content-Type", arquivo.tipo);

    // Envia o arquivo como resposta
    res.end(fileData, 'binary');
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
};

