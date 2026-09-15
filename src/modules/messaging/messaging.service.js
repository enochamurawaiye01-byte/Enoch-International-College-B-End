const AppError = require("../../core/errors/AppError");
const NotFoundError = require("../../core/errors/NotFoundError");
const repository = require("./messaging.repository");
const { canMessage } = require("./messaging.utils");
const send = async (data, user) => { const receiver = await repository.findUser(data.receiverId); if (!receiver || receiver.status !== "ACTIVE") throw new NotFoundError("Active receiver not found"); if (!canMessage(user.role, receiver.role)) throw new AppError("Messaging is not permitted between these accounts.", 403, "MESSAGING_NOT_ALLOWED"); return repository.create({ senderId: user.userId, receiverId: receiver.id, subject: data.subject || null, body: data.body, status: "SENT" }); };
const inbox = (user) => repository.findInbox(user.userId);
const sent = (user) => repository.findSent(user.userId);
const markRead = async (id, user) => { const message = await repository.findById(id); if (!message) throw new NotFoundError("Message not found"); if (message.receiverId !== user.userId) throw new AppError("You can only update messages received by you.", 403, "MESSAGE_ACCESS_DENIED"); return repository.markRead(id); };
module.exports = { send, inbox, sent, markRead };
