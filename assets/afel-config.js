// Configuration publique du site AFEL. La clé « publishable » est faite pour être visible :
// elle ne donne accès qu'aux fonctions publiques (demander_adhesion, verifier_carte),
// les tables restent fermées par les règles RLS.
window.AFEL_CONFIG = {
  supabaseUrl: 'https://wkeieiwereziyyvxqhlx.supabase.co',
  supabaseKey: 'sb_publishable_WB4FI9tH43WNRYnH1qKXbQ_bYZIOx9C'
};
window.afelRpc = function (fn, args) {
  var c = window.AFEL_CONFIG;
  return fetch(c.supabaseUrl + '/rest/v1/rpc/' + fn, {
    method: 'POST',
    headers: { 'apikey': c.supabaseKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(args || {})
  }).then(function (r) {
    return r.json().then(function (d) {
      if (!r.ok) { var e = new Error((d && d.message) || 'Erreur du serveur.'); e.status = r.status; throw e; }
      return d;
    });
  });
};
