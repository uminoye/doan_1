const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'KHOA_BIMAT_CUA_DU_AN_XUAT_NHAP_TON';

const verifyToken = (req, res, next) => {
  let token = req.headers['authorization'];
  if (!token) return res.status(403).json({ message: 'Không tìm thấy thẻ xác thực (Token)' });

  try {
    const tokenBody = token.split(' ')[1];
    const decoded = jwt.verify(tokenBody, JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.roleId;
    req.userRoleName = decoded.roleName;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.userRoleName || !roles.includes(req.userRoleName)) {
      return res.status(403).json({ message: 'Bạn không có quyền thực hiện thao tác này' });
    }
    next();
  };
};

module.exports = { verifyToken, requireRole, JWT_SECRET };
