// Controllo anti-abuso opzionale compatibile con Spark, disattivato per impostazione predefinita.
// Per abilitare: registrare il dominio e configurare la chiave pubblica reCAPTCHA Enterprise
// in firebase-config.js, poi attivare la protezione App Check in Firebase Console.
// Prima di far rispettare l'attestazione, testare SIA sito pubblico SIA CMS.
export async function initOptionalAppCheck(app,siteKey){
 if(!siteKey)return false;
 try{
  const {initializeAppCheck,ReCaptchaEnterpriseProvider}=await import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app-check.js');
  initializeAppCheck(app,{provider:new ReCaptchaEnterpriseProvider(siteKey),isTokenAutoRefreshEnabled:true});
  return true;
 }catch(error){
  console.warn('App Check non inizializzato. Controllare la configurazione prima di attivare enforcement.',error);
  return false;
 }
}
