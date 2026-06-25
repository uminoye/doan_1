import { Request, Response } from 'express';
import { CustomerService } from '../services/customerService';
import { WarehouseService } from '../services/warehouseService';
import { ProductService } from '../services/productService';
import { CategoryService } from '../services/categoryService';
import { asyncHandler } from '../middlewares/errorHandler';

const customerService = new CustomerService();
const warehouseService = new WarehouseService();
const productService = new ProductService();
const categoryService = new CategoryService();

export const customerController = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, search } = req.query;
    const result = await customerService.getAll({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      search: search as string,
    });
    res.json(result);
  }),
  getById: asyncHandler(async (req: Request, res: Response) => {
    res.json(await customerService.getById(String(req.params.id)));
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    const result = await customerService.create(req.body);
    res.status(201).json(result);
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    res.json(await customerService.update(String(req.params.id), req.body));
  }),
  delete: asyncHandler(async (req: Request, res: Response) => {
    res.json(await customerService.delete(String(req.params.id)));
  }),
};

export const warehouseController = {
  getAll: asyncHandler(async (_req: Request, res: Response) => {
    res.json(await warehouseService.getAll());
  }),
  getById: asyncHandler(async (req: Request, res: Response) => {
    res.json(await warehouseService.getById(String(req.params.id)));
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    const result = await warehouseService.create(req.body);
    res.status(201).json(result);
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    res.json(await warehouseService.update(String(req.params.id), req.body));
  }),
  delete: asyncHandler(async (req: Request, res: Response) => {
    res.json(await warehouseService.delete(String(req.params.id)));
  }),
};

export const productController = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, search, category, warehouseId, stockStatus } = req.query;
    const result = await productService.getAll({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      search: search as string,
      category: category as string,
      warehouseId: warehouseId as string,
      stockStatus: stockStatus as any,
    });
    res.json(result);
  }),
  getById: asyncHandler(async (req: Request, res: Response) => {
    res.json(await productService.getById(String(req.params.id)));
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    const result = await productService.create(req.body);
    res.status(201).json(result);
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    const { stockDistribution, ...data } = req.body as any;
    res.json(await productService.update(String(req.params.id), data, stockDistribution));
  }),
  delete: asyncHandler(async (req: Request, res: Response) => {
    res.json(await productService.delete(String(req.params.id)));
  }),
  getCategories: asyncHandler(async (_req: Request, res: Response) => {
    res.json(await productService.getCategories());
  }),
};

export const categoryController = {
  getAll: asyncHandler(async (_req: Request, res: Response) => {
    res.json(await categoryService.getAll());
  }),
  getById: asyncHandler(async (req: Request, res: Response) => {
    res.json(await categoryService.getById(String(req.params.id)));
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    const result = await categoryService.create(req.body);
    res.status(201).json(result);
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    res.json(await categoryService.update(String(req.params.id), req.body));
  }),
  delete: asyncHandler(async (req: Request, res: Response) => {
    res.json(await categoryService.delete(String(req.params.id)));
  }),
};
