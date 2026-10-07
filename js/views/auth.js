/** Écrans de connexion (Supabase uniquement) : lien magique par e-mail, accès refusé. */
import { S } from "../store.js";
import { esc } from "../utils.js";

export function renderLogin(message = "") {
  return `<div class="auth">
    <h2>Connexion</h2>
    <p class="note">Saisissez votre adresse e-mail : vous recevrez un lien de connexion. Seules les adresses autorisées accèdent aux projets.</p>
    <form id="login-form">
      <input id="login-email" type="email" required autocomplete="email" placeholder="prenom@societe.com">
      <button class="btn primary" type="submit">Recevoir le lien</button>
    </form>
    ${message ? `<p class="note" role="status">${esc(message)}</p>` : ""}
  </div>`;
}

export function renderNoAccess() {
  const email = S.auth && S.auth.user ? S.auth.user.email : "";
  return `<div class="auth">
    <h2>Accès non autorisé</h2>
    <p class="note">L'adresse ${esc(email)} n'est pas dans la liste des membres. Demandez à l'administrateur de l'ajouter dans la table « membres » de Supabase.</p>
    <button class="btn" data-act="logout">Se déconnecter</button>
  </div>`;
}
