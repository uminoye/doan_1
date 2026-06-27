const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { JWT_SECRET } = require('../middlewares/auth');

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu' });

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) return res.status(404).json({ message: 'Tài khoản không tồn tại' });

    const passwordIsValid = bcrypt.compareSync(password, user.passwordHash);
    if (!passwordIsValid) return res.status(401).json({ message: 'Sai mật khẩu' });

    const token = jwt.sign(
      { id: user.id, roleId: user.roleId, roleName: user.role.name },
      JWT_SECRET,
      { expiresIn: 86400 }
    );

    res.json({
      message: 'Đăng nhập thành công',
      user: {
        id: user.id,
        full_name: user.fullName,
        email: user.email,
        role_id: user.roleId,
        role_name: user.role.name,
      },
      accessToken: token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// GET ALL USERS
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });
    const result = users.map(u => ({
      id: u.id,
      email: u.email,
      full_name: u.fullName,
      role_id: u.roleId,
      role_name: u.role.name,
    }));
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi Database' });
  }
});

// CREATE USER
router.post('/users', async (req, res) => {
  try {
    const { email, password, full_name, role_id } = req.body;
    if (!email || !password || !full_name) {
      return res.status(400).json({ message: 'Vui lòng nhập đủ thông tin!' });
    }

    const hashed_password = bcrypt.hashSync(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashed_password,
        fullName: full_name,
        roleId: role_id || 'sales',
      },
    });

    res.status(201).json({ message: 'Tạo tài khoản thành công!', id: user.id });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Email này đã được sử dụng!' });
    }
    console.error(error);
    res.status(500).json({ message: 'Lỗi khi tạo tài khoản' });
  }
});

// UPDATE USER
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, role_id, password } = req.body;

    const updateData = {};
    if (full_name) updateData.fullName = full_name;
    if (role_id) updateData.roleId = role_id;
    if (password) updateData.passwordHash = bcrypt.hashSync(password, 10);

    await prisma.user.update({ where: { id }, data: updateData });
    res.json({ message: 'Cập nhật thành công!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi khi cập nhật tài khoản' });
  }
});

// DELETE USER
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (user?.role?.name === 'admin') {
      return res.status(400).json({ message: 'Tuyệt đối không được xóa tài khoản Admin gốc!' });
    }
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'Đã xóa tài khoản nhân viên!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi khi xóa tài khoản' });
  }
});

module.exports = router;
