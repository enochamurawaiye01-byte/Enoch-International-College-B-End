const service = require("./library.service");
const createBook = async (req, res, next) => { try { return res.status(201).json({ success: true, data: await service.createBook(req.body) }); } catch (error) { next(error); } };
const getBooks = async (req, res, next) => { try { return res.json({ success: true, data: await service.getBooks(req.query) }); } catch (error) { next(error); } };
const createCopy = async (req, res, next) => { try { return res.status(201).json({ success: true, data: await service.createCopy(req.body) }); } catch (error) { next(error); } };
const issueLoan = async (req, res, next) => { try { return res.status(201).json({ success: true, data: await service.issueLoan(req.body) }); } catch (error) { next(error); } };
const returnLoan = async (req, res, next) => { try { return res.json({ success: true, data: await service.returnLoan(req.params.id, req.body) }); } catch (error) { next(error); } };
const getLoans = async (req, res, next) => { try { return res.json({ success: true, data: await service.getLoans(req.query) }); } catch (error) { next(error); } };
module.exports = { createBook, getBooks, createCopy, issueLoan, returnLoan, getLoans };
