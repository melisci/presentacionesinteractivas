import { roomStore } from "../state/store.js";

const roomChannel = (code) => `room:${code}`;

function broadcastRoomState(io, room) {
  io.to(roomChannel(room.code)).emit("session:state", room.toSummaryJSON());
}

export function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    // --- Presenter events -------------------------------------------------

    socket.on("presenter:create-session", (_payload, ack) => {
      const room = roomStore.createRoom(socket.id);
      socket.join(roomChannel(room.code));
      socket.data.role = "presenter";
      socket.data.roomCode = room.code;
      ack?.({ ok: true, room: room.toSummaryJSON() });
    });

    socket.on("presenter:add-slide", ({ type, title, options, imageUrl } = {}, ack) => {
      const room = roomStore.findRoomByPresenter(socket.id);
      if (!room) return ack?.({ ok: false, error: "No hay sesión activa." });
      if (!["poll", "wordcloud", "image"].includes(type)) {
        return ack?.({ ok: false, error: "Tipo de slide inválido." });
      }
      if (type !== "image" && !title?.trim()) {
        return ack?.({ ok: false, error: "El título es obligatorio." });
      }
      if (type === "poll" && (!Array.isArray(options) || options.length < 2)) {
        return ack?.({ ok: false, error: "Una encuesta necesita al menos 2 opciones." });
      }
      if (type === "image" && !imageUrl?.trim()) {
        return ack?.({ ok: false, error: "Falta la imagen." });
      }

      const slide = room.addSlide({ type, title: title?.trim() ?? "", options, imageUrl });
      ack?.({ ok: true, slide: slide.toJSON() });
      broadcastRoomState(io, room);
    });

    socket.on("presenter:reorder-slides", ({ slideIds } = {}, ack) => {
      const room = roomStore.findRoomByPresenter(socket.id);
      if (!room) return ack?.({ ok: false, error: "No hay sesión activa." });
      if (!Array.isArray(slideIds)) return ack?.({ ok: false, error: "Orden inválido." });

      const success = room.reorderSlides(slideIds);
      if (!success) return ack?.({ ok: false, error: "El orden no coincide con las slides actuales." });

      ack?.({ ok: true });
      broadcastRoomState(io, room);
    });

    socket.on("presenter:set-active-slide", ({ slideId } = {}, ack) => {
      const room = roomStore.findRoomByPresenter(socket.id);
      if (!room) return ack?.({ ok: false, error: "No hay sesión activa." });

      const success = room.setActiveSlide(slideId);
      if (!success) return ack?.({ ok: false, error: "Slide no encontrado." });

      ack?.({ ok: true });
      broadcastRoomState(io, room);
    });

    socket.on("presenter:reset-slide", ({ slideId } = {}, ack) => {
      const room = roomStore.findRoomByPresenter(socket.id);
      if (!room) return ack?.({ ok: false, error: "No hay sesión activa." });

      const slide = room.getSlide(slideId);
      if (!slide) return ack?.({ ok: false, error: "Slide no encontrado." });

      slide.reset();
      for (const participant of room.participants.values()) {
        participant.votedSlideIds.delete(slideId);
      }

      ack?.({ ok: true });
      broadcastRoomState(io, room);
    });

    socket.on("presenter:end-session", (_payload, ack) => {
      const room = roomStore.findRoomByPresenter(socket.id);
      if (!room) return ack?.({ ok: false, error: "No hay sesión activa." });

      io.to(roomChannel(room.code)).emit("session:ended");
      io.socketsLeave(roomChannel(room.code));
      roomStore.deleteRoom(room.code);
      ack?.({ ok: true });
    });

    // --- Audience events -----------------------------------------------

    socket.on("audience:join", ({ code, nickname } = {}, ack) => {
      const room = roomStore.getRoom(code);
      if (!room) return ack?.({ ok: false, error: "Código de sesión inválido." });

      room.addParticipant(socket.id, nickname);
      socket.join(roomChannel(room.code));
      socket.data.role = "audience";
      socket.data.roomCode = room.code;

      ack?.({ ok: true, room: room.toSummaryJSON() });
      broadcastRoomState(io, room);
    });

    // --- Display events (solo lectura, para embeber en Canva u otra pantalla) --

    socket.on("display:join", ({ code } = {}, ack) => {
      const room = roomStore.getRoom(code);
      if (!room) return ack?.({ ok: false, error: "Código de sesión inválido." });

      socket.join(roomChannel(room.code));
      socket.data.role = "display";
      socket.data.roomCode = room.code;

      ack?.({ ok: true, room: room.toSummaryJSON() });
    });

    socket.on("audience:vote", ({ optionId } = {}, ack) => {
      const room = roomStore.findRoomByParticipant(socket.id);
      if (!room) return ack?.({ ok: false, error: "No estás en ninguna sesión." });

      const slide = room.activeSlide;
      if (!slide || slide.type !== "poll") {
        return ack?.({ ok: false, error: "No hay una encuesta activa." });
      }
      if (room.hasVoted(socket.id, slide.id)) {
        return ack?.({ ok: false, error: "Ya votaste en esta encuesta." });
      }

      const success = slide.registerVote(optionId);
      if (!success) return ack?.({ ok: false, error: "Opción inválida." });

      room.markVoted(socket.id, slide.id);
      ack?.({ ok: true });
      broadcastRoomState(io, room);
    });

    socket.on("audience:submit-word", ({ text } = {}, ack) => {
      const room = roomStore.findRoomByParticipant(socket.id);
      if (!room) return ack?.({ ok: false, error: "No estás en ninguna sesión." });

      const slide = room.activeSlide;
      if (!slide || slide.type !== "wordcloud") {
        return ack?.({ ok: false, error: "No hay una nube de palabras activa." });
      }

      const success = slide.registerWord(text ?? "");
      if (!success) return ack?.({ ok: false, error: "Texto inválido." });

      ack?.({ ok: true });
      broadcastRoomState(io, room);
    });

    // --- Disconnect -------------------------------------------------------

    socket.on("disconnect", () => {
      if (socket.data.role === "presenter") {
        const room = roomStore.findRoomByPresenter(socket.id);
        if (room) {
          io.to(roomChannel(room.code)).emit("session:ended");
          roomStore.deleteRoom(room.code);
        }
      }

      if (socket.data.role === "audience") {
        const room = roomStore.findRoomByParticipant(socket.id);
        if (room) {
          room.removeParticipant(socket.id);
          broadcastRoomState(io, room);
        }
      }
    });
  });
}
