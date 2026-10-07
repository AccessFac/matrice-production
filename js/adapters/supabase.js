/**
 * Adaptateur Supabase (base PostgreSQL gratuite) : utilisé quand l'app est hébergée hors de claude.ai
 * (GitHub Pages, Netlify…). Table et règles d'accès : supabase/schema.sql.
 *
 * Connexion par lien magique envoyé par e-mail. Seules les adresses listées dans la table
 * public.membres voient les données ; le rôle « edition » peut modifier, « lecture » seulement consulter.
 */
const SUPABASE_JS = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src; s.onload = resolve; s.onerror = () => reject(new Error("Chargement impossible : " + src));
    document.head.appendChild(s);
  });
}

export function createSupabaseAdapter({ url, anonKey }) {
  let client = null, session = null;

  async function fetchCollection(col) {
    const { data, error } = await client.from("documents").select("id,data").eq("collection", col);
    if (error) throw error;
    return data.map(r => ({ id: r.id, data: r.data }));
  }

  /** Abonnement temps réel : on relit la collection à chaque changement (volumes faibles). */
  function subscribe(col, refresh) {
    const ch = client.channel("documents-" + col + "-" + Math.random().toString(36).slice(2))
      .on("postgres_changes", { event: "*", schema: "public", table: "documents", filter: `collection=eq.${col}` }, refresh)
      .subscribe();
    return () => client.removeChannel(ch);
  }

  return {
    name: "supabase",

    async init() {
      if (!window.supabase) await loadScript(SUPABASE_JS);
      client = window.supabase.createClient(url, anonKey);
      ({ data: { session } } = await client.auth.getSession());
      client.auth.onAuthStateChange((evt, s) => {
        const changed = !!s !== !!session;
        session = s;
        if (changed) location.reload();
      });
      if (!session) return { online: true, needsAuth: true, readOnly: true, canDownload: true };

      // Rôle de l'utilisateur (table membres) : sans ligne → aucun accès
      const email = session.user.email;
      const { data: m } = await client.from("membres").select("role").eq("email", email).maybeSingle();
      if (!m) return { online: true, noAccess: true, readOnly: true, user: { email }, canDownload: true };
      return { online: true, readOnly: m.role !== "edition", user: { email }, canDownload: true };
    },

    async signIn(email) {
      const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: location.href.split("#")[0] } });
      if (error) throw error;
    },

    async signOut() { await client.auth.signOut(); },

    watchDoc(col, id, next, onError) {
      const refresh = async () => {
        try {
          const { data, error } = await client.from("documents").select("data").eq("collection", col).eq("id", id).maybeSingle();
          if (error) throw error;
          next(data ? data.data : null);
        } catch (e) { onError && onError(e); }
      };
      refresh();
      return subscribe(col, refresh);
    },

    watchCollection(col, next, onError) {
      const refresh = async () => {
        try { next(await fetchCollection(col)); } catch (e) { onError && onError(e); }
      };
      refresh();
      return subscribe(col, refresh);
    },

    async set(col, id, data) {
      const { error } = await client.from("documents").upsert({ collection: col, id, data, updated_at: new Date().toISOString() });
      if (error) throw error;
    },

    async remove(col, id) {
      const { error } = await client.from("documents").delete().eq("collection", col).eq("id", id);
      if (error) throw error;
    },

    /** 42501 = refus RLS (rôle « lecture » ou non membre). */
    isReadOnlyError(e) { return !!e && (e.code === "42501" || e.status === 401 || e.status === 403); },

    download(filename, text) { browserDownload(filename, text); }
  };
}

export function browserDownload(filename, text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
