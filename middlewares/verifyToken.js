import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ mensagem: "Acesso negado. Nenhum token fornecido." });
    }

    const token = authHeader.split(' ')[1]; // Assume que o token está no formato "Bearer TOKEN"

    if (!token) {
        return res.status(401).json({ mensagem: "Acesso negado. Token mal formatado." });
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {    
          if (err.name === 'TokenExpiredError') {
              return res.status(403).json({ mensagem: "Token expirado." });
          } else {
              return res.status(403).json({ mensagem: "Token inválido.", erro: err.message });
          }
      }
  
      req.usuario = decoded;
      next();
  });
  
};