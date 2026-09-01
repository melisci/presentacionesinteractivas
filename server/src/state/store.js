import { customAlphabet } from "nanoid";

const generateCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

/** @typedef {"poll" | "wordcloud" | "image"} SlideType */

class Slide {
  constructor({ id, type, title, options, imageUrl }) {
    this.id = id;
    this.type = type;
    this.title = title;

    if (type === "poll") {
      this.options = (options ?? []).map((text, index) => ({
        id: `${id}-opt-${index}`,
        text,
        votes: 0,
      }));
    }

    if (type === "wordcloud") {
      this.words = {};
    }

    if (type === "image") {
      this.imageUrl = imageUrl;
    }
  }

  registerVote(optionId) {
    if (this.type !== "poll") return false;
    const option = this.options.find((o) => o.id === optionId);
    if (!option) return false;
    option.votes += 1;
    return true;
  }

  registerWord(text) {
    if (this.type !== "wordcloud") return false;
    const normalized = text.trim().toLowerCase().slice(0, 40);
    if (!normalized) return false;
    this.words[normalized] = (this.words[normalized] ?? 0) + 1;
    return true;
  }

  reset() {
    if (this.type === "poll") {
      this.options.forEach((o) => (o.votes = 0));
    }
    if (this.type === "wordcloud") {
      this.words = {};
    }
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      title: this.title,
      ...(this.type === "poll" ? { options: this.options } : {}),
      ...(this.type === "wordcloud" ? { words: this.words } : {}),
      ...(this.type === "image" ? { imageUrl: this.imageUrl } : {}),
    };
  }
}

class Room {
  constructor(code, presenterSocketId) {
    this.code = code;
    this.presenterSocketId = presenterSocketId;
    this.slides = new Map();
    this.slideOrder = [];
    this.activeSlideId = null;
    this.participants = new Map(); // socketId -> { id, nickname, votedSlideIds: Set }
    this.createdAt = Date.now();
  }

  addSlide({ type, title, options, imageUrl }) {
    const id = `slide-${this.slideOrder.length + 1}-${Date.now().toString(36)}`;
    const slide = new Slide({ id, type, title, options, imageUrl });
    this.slides.set(id, slide);
    this.slideOrder.push(id);
    return slide;
  }

  getSlide(slideId) {
    return this.slides.get(slideId) ?? null;
  }

  reorderSlides(newOrder) {
    const current = [...this.slideOrder].sort();
    const proposed = [...newOrder].sort();
    const isSamePermutation =
      current.length === proposed.length && current.every((id, i) => id === proposed[i]);
    if (!isSamePermutation) return false;

    this.slideOrder = newOrder;
    return true;
  }

  get activeSlide() {
    return this.activeSlideId ? this.getSlide(this.activeSlideId) : null;
  }

  setActiveSlide(slideId) {
    if (!this.slides.has(slideId)) return false;
    this.activeSlideId = slideId;
    return true;
  }

  addParticipant(socketId, nickname) {
    const participant = {
      id: socketId,
      nickname: nickname?.trim().slice(0, 30) || "Anónimo",
      votedSlideIds: new Set(),
      joinedAt: Date.now(),
    };
    this.participants.set(socketId, participant);
    return participant;
  }

  removeParticipant(socketId) {
    this.participants.delete(socketId);
  }

  hasVoted(socketId, slideId) {
    return this.participants.get(socketId)?.votedSlideIds.has(slideId) ?? false;
  }

  markVoted(socketId, slideId) {
    this.participants.get(socketId)?.votedSlideIds.add(slideId);
  }

  get participantCount() {
    return this.participants.size;
  }

  toSummaryJSON() {
    return {
      code: this.code,
      activeSlide: this.activeSlide ? this.activeSlide.toJSON() : null,
      slides: this.slideOrder.map((id) => this.slides.get(id).toJSON()),
      participantCount: this.participantCount,
    };
  }
}

class RoomStore {
  constructor() {
    /** @type {Map<string, Room>} */
    this.rooms = new Map();
  }

  createRoom(presenterSocketId) {
    let code;
    do {
      code = generateCode();
    } while (this.rooms.has(code));

    const room = new Room(code, presenterSocketId);
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code) {
    return this.rooms.get(code?.toUpperCase()) ?? null;
  }

  deleteRoom(code) {
    this.rooms.delete(code);
  }

  findRoomByPresenter(socketId) {
    for (const room of this.rooms.values()) {
      if (room.presenterSocketId === socketId) return room;
    }
    return null;
  }

  findRoomByParticipant(socketId) {
    for (const room of this.rooms.values()) {
      if (room.participants.has(socketId)) return room;
    }
    return null;
  }
}

export const roomStore = new RoomStore();
