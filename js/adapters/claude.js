/**
 * Adaptateur claude.ai : utilisé quand la page est publiée comme artifact Claude.
 * Les données sont stockées dans la base partagée de l'artifact (capabilities db, user, downloads).
 */
export function createClaudeAdapter() {
  let db = null, downloads = null;

  return {
    name: "claude",

    async init() {
      const c = window.claude;
      try { db = await c.use("db"); } catch (e) { db = null; }
      try { downloads = await c.use("downloads"); } catch (e) { downloads = null; }
      let readOnly = false;
      try {
        const user = await c.use("user");
        if (user && (await user.can("data.write")) === false) readOnly = true;
      } catch (e) { /* inconnu : un refus d'écriture tranchera */ }
      return { online: !!db, readOnly, canDownload: !!downloads };
    },

    watchDoc(col, id, next, onError) {
      return db.doc(`${col}/${id}`).onSnapshot(s => next(s.exists ? s.data() : null), onError);
    },

    watchCollection(col, next, onError) {
      return db.collection(col).onSnapshot(qs => next(qs.docs.map(d => ({ id: d.id, data: d.data() }))), onError);
    },

    set(col, id, data) { return db.doc(`${col}/${id}`).set(data); },

    remove(col, id) { return db.doc(`${col}/${id}`).delete(); },

    /** Codes d'erreur qui signifient « pas le droit d'écrire ». */
    isReadOnlyError(e) { return !!e && ["invalid_argument", "not_granted", "revoked"].includes(e.code); },

    async download(filename, text) {
      if (!downloads) return;
      try { await downloads.save({ filename, data: text }); }
      catch (e) { if (e && e.code === "unavailable") downloads = null; }
    }
  };
}
