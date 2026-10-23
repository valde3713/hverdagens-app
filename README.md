# Hverdagens app

En statisk, dansk app til GitHub Pages. Brugere logger ind med kaldenavn og personlig kode, deler en god gerning for naturen og får ét point pr. delt gerning. Profiler og pointtavle deles via Supabase.

## Sæt Supabase op

1. Opret et Supabase-projekt.
2. Åbn projektets **SQL Editor**, indsæt indholdet fra `supabase.sql`, og kør det.
3. Find projektets URL og **anon/public key** under **Project Settings → API**, og sæt dem ind i `config.js`:

   ```js
   window.APP_CONFIG = {
     supabaseUrl: "https://DIT-PROJEKT.supabase.co",
     supabaseAnonKey: "DIN_SUPABASE_ANON_KEY"
   };
   ```

   Den offentlige anon key er beregnet til klientapps. Læg aldrig projektets `service_role`-nøgle i denne app.
4. Under **Authentication → Providers → Email**, slå e-mailbekræftelse fra. Appens adgangskodelogin bruger et syntetisk login-id og kræver ikke en e-mailadresse.

Adgangskoder skal være mindst 8 tegn. Brugere kan logge ind fra flere enheder med samme kaldenavn og kode. Når man er logget ind, kan adgangskoden ændres under **Min profil → Indstillinger**. Kaldenavn kan ændres efter mindst 36 delte gerninger. Appens tema og sprogvalg gemmes lokalt i browseren. Brugere kan hente en JSON-kopi af deres appdata og slette konto og tilhørende data fra **Indstillinger → Dine data**. Brugere kan også slette enkelte gerninger.

Pointtavlen viser kaldenavne og antal delte gerninger; selve beskrivelserne er kun synlige for den bruger, der skrev dem. Point gives automatisk for hver indsendelse, så tavlen bygger på tillid og er ikke en verificeret konkurrence.

Databasepolitikkerne begrænser læsning og ændring til de nødvendige roller; brugere kan kun slette egne gerninger. Kaldenavne valideres også i databasen. `get_login_email` beregner appens syntetiske loginadresse ud fra kaldenavnet i stedet for at slå konti op. Supabase `anon`/publishable-nøglen er offentlig og må gerne ligge i frontend; `service_role`-nøglen og databaseadgangskoden må aldrig udgives.

Læs også [privatlivsinformationen](./privacy.html). Supabase-projektet er oplyst at ligge i en EU-region; kontrollér den præcise region i Dashboard. Supabase JavaScript-biblioteket ligger lokalt sammen med appen, så brugerens browser ikke skal hente appkode fra en ekstra CDN. Placering i EU er ikke i sig selv en garanti for overholdelse af GDPR. Indsæt en privat kontaktadresse på privatlivssiden, og få de juridiske oplysninger gennemgået, før appen åbnes for flere brugere.

## Android- og iOS-app

Mobilappen bruger Capacitor til at pakke den samme app til Android og iOS. `config.js` indeholder den offentlige Supabase-nøgle og pakkes med appen; læg aldrig `service_role`-nøglen i klienten.

1. Installér Node.js 22 eller nyere, Java 21, Android Studio/Android SDK og Xcode på en Mac til iOS.
2. Installér JavaScript-afhængigheder, kopiér webappen til mobilprojektet, og synkronisér:

   ```sh
   npm install
   npm run mobile:sync
   ```

   Hvis Android- eller iOS-projektmappen mangler, opret den én gang med `npx cap add android` eller `npx cap add ios`.
3. Efter webændringer:

   ```sh
   npm run mobile:sync
   ```

4. Android: Åbn `android/` i Android Studio, eller byg en debug-APK med `cd android && ./gradlew assembleDebug`. APK'en ligger i `android/app/build/outputs/apk/debug/`.
5. iOS: På en Mac, kør `npx cap open ios`, vælg et signing team i Xcode, og byg/arkivér appen der. En IPA til installation/distribution kræver Apples signering og en Apple-udviklerkonto. IPA kan ikke bygges eller signeres på Linux.

## Kør lokalt

Fra projektmappen kan du starte en simpel webserver:

```sh
python3 -m http.server 8000
```

Åbn derefter `http://localhost:8000`. `file://` virker ikke, fordi appen bruger JavaScript-moduler.

## Udgiv på GitHub Pages

1. Push projektmappens filer til roden af et GitHub-repository.
2. Åbn repositoryets **Settings → Pages**.
3. Under **Build and deployment** vælg **Deploy from a branch**, vælg `main` og mappen `/ (root)`, og gem.

Appen kræver ingen build-trin. `config.js` skal være udfyldt, inden appen udgives. Supabase JavaScript-biblioteket i `vendor/` er version 2.118.0 (MIT-licens; se `vendor/LICENSE.supabase-js`). Kør hele `supabase.sql` igen efter databaseændringer; filen er skrevet, så eksisterende tabeller og policies kan opdateres.
