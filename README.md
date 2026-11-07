# Hverdagens app

En statisk, dansk app til GitHub Pages. Brugere logger ind med kaldenavn og personlig kode, deler en god gerning for naturen og får point, når appens lokale AI godkender teksten. Profiler og pointtavle deles via Supabase.

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
4. Under **Authentication → Providers → Email**, slå e-mailbekræftelse fra. Login bruger kaldenavn og en syntetisk loginadresse. Ved oprettelse indtaster brugeren også en privat kontakt-e-mail; den bruges ikke til login og er ikke bekræftet.

Adgangskoder skal være mindst 8 tegn. Brugere kan logge ind fra flere enheder med samme kaldenavn og kode. Når man er logget ind, kan adgangskoden ændres under **Min profil → Indstillinger**. Kaldenavn kan ændres når som helst under indstillinger. Appens tema og sprogvalg gemmes lokalt i browseren. Brugere kan hente en JSON-kopi af deres appdata og slette konto og tilhørende data fra **Indstillinger → Dine data**. Brugere kan også slette enkelte gerninger.

Ved oprettelse skal brugeren acceptere vilkårene og bekræfte at have læst privatlivsinformationen. Brugeren vælger, om andre indloggede brugere ser kaldenavn eller eget navn. E-mailen forbliver privat. Offentlige profiler kan søges frem fra pointtavlen og vise profiltekst og delte gerninger. Eksisterende brugere skal aktivt slå offentlig profil til i indstillinger, før de vises i søgning og på pointtavlen. De kan også slå offentlig visning fra igen. Pointtavlen bygger på brugernes egne indberetninger og er ikke en verificeret konkurrence.

## Privat adminoversigt

`/codespace-time/` logger ind med en eksisterende konto og en ekstra admin-kode på 4–64 bogstaver og/eller tal; der er ingen oprettelsesmulighed. Databasefunktionen `get_admin_dashboard()` returnerer kun data, hvis den verificerede bruger står i den private tabel `admin_users` og indtaster korrekt kode. Databasen gemmer kun en bcrypt-hash, begrænser forkerte forsøg og viser ikke private e-mailadresser.

Brugere kan ændre kaldenavn efter mindst 35 gerninger. Admin kan også ændre kaldenavn via adminoversigten uanset antal gerninger. Admins kan redigere visningsnavn, profiltekst og offentlig profilstatus, slette enkelte aktiviteter og slette almindelige brugerkonti med deres aktiviteter. Owner kan også fjerne admin-adgang uden at slette kontoen. Admin-konti og den aktuelt indloggede konto kan ikke slettes fra oversigten. Kør `supabase-admin-management.sql` i SQL Editor efter `supabase.sql` for at aktivere handlingerne. Denne ekstra migration ændrer ikke hovedfilen `supabase.sql`.

Der kan kun være én konto med rollen `owner`. Owner får et mærke på sin egen og offentlige profil og er den eneste, der kan tilføje admins fra adminoversigten. Admin får tilsvarende et Admin-mærke på profilen. Kør altid `supabase-admin-management.sql` efter `supabase.sql`, da hovedfilen opretter grundskemaet, mens admin-migrationen tilføjer ejerfunktionerne. Kør derefter `supabase-admin-setup.sql` for den første opsætning. Filen sætter som eksempel kaldenavnet `test` som Owner; erstat det med din egen konto. Erstat admin-kaldenavnene og `VAELG_DIN_EGEN_ADMIN_KODE` med eksisterende konti og en fælles admin-kode, du selv vælger. Tilføj eller fjern admin-kaldenavne efter behov. Hver person logger stadig ind med sin egen personlige konto-kode plus den fælles admin-kode. Skriv aldrig personlige login-koder i SQL. Hvis den eksisterende Owner skal overføres til `valde`, kan du køre `supabase-admin-transfer-owner.sql` efter admin-migrationen; den bevarer den eksisterende admin-kode.

Admin-koden gemmes som bcrypt-hash. Vælg en unik kode, og del den ikke. Efter fem forkerte forsøg låses admin-koden i 15 minutter. Der er ingen offentlig kontooprettelse, og private e-mailadresser udleveres ikke af dashboardet.

## Lokal AI og pointhistorik

Kør SQL-filerne i denne rækkefølge i Supabase SQL Editor: `supabase.sql`, `supabase-admin-management.sql`, `supabase-admin-setup.sql` ved første opsætning og til sidst `supabase-ai-points.sql`. Hvis Owner skal overføres, kør også `supabase-admin-transfer-owner.sql` efter admin-opsætningen. Kør admin-migrationen efter hovedfilen hver gang hovedfilen genkøres, og kør derefter `supabase-ai-points.sql`.

Appen bruger Transformers.js og en kvantiseret, flersproget zero-shot-model til lokalt at vurdere gerningsteksten. En positiv handling får 1–5 point efter modellens vurdering af den beskrevne effekt. En skadelig handling, fx at smide affald i naturen eller køre i benzin-/dieselbil, giver −1 point pr. indberetning. Eksisterende gerninger får et historisk +1-point, så pointtavlen bevares. Owner og admins kan også tilføje manuelle plus- og minusjusteringer. Modellen kan tage fejl, og dens vurdering beviser ikke, at handlingen faktisk er sket. Alle point gemmes i en historik, som ikke kan slettes eller redigeres enkeltvis i appen; rettelser foretages som nye poster. Pointhistorikken slettes sammen med kontoen.

AI-modellen hentes første gang fra Hugging Face (ca. 125 MB) og caches i browseren, når browseren understøtter det. Selve klassificeringen udføres lokalt, og teksten sendes ikke til Hugging Face eller esm.sh. Der kræves ingen AI-API-nøgle, og der er ingen betaling pr. vurdering. Internet kræves første gang modellen hentes; browseren kan senere rydde sin cache. Den lokale kontrol i klienten kan omgås af en bruger, der kalder Supabase API direkte. Den giver derfor ikke server-side beskyttelse mod falske indberetninger. Indberettede handlinger gemmes i Supabase som appdata.

Databasepolitikkerne begrænser læsning og ændring til de nødvendige roller; brugere kan kun slette egne gerninger og kan ikke ændre pointtabellen direkte. Kaldenavne valideres også i databasen. `get_login_email` beregner appens syntetiske loginadresse ud fra kaldenavnet i stedet for at slå konti op. Supabase `anon`/publishable-nøglen er offentlig og må gerne ligge i frontend; `service_role`-nøglen og databaseadgangskoden må aldrig udgives.

Kør alle migrationer i den angivne rækkefølge, før den opdaterede app bruges. Hovedfilen opretter profil- og private kontaktdatafunktioner, vilkårsregistrering samt selvbetjent kontoeksport/-sletning. `supabase-ai-points.sql` opdaterer pointtavlen til at bruge pointhistorikken. Hvis du tidligere har deployet Edge Function `score-deed`, fjern den fra Supabase, da den ikke længere bruges. Eksisterende profiler bliver ikke automatisk offentlige; hver bruger skal selv slå offentlig profil til. Migrationen fjerner de gamle, inaktive e-mail-2FA-tabeller.

Læs også [vilkårene](./terms.html) og [privatlivsinformationen](./privacy.html). Supabase-projektet er oplyst at ligge i en EU-region; kontrollér den præcise region i Dashboard. Supabase JavaScript-biblioteket ligger lokalt sammen med appen. Transformers.js-modulet og AI-model-filerne hentes fra esm.sh og Hugging Face; appen sender ikke gerningsteksten til disse tjenester for AI-vurdering. Placering i EU er ikke i sig selv en garanti for overholdelse af GDPR. Indsæt den dataansvarliges kontaktadresse på privatlivssiden, og få de juridiske oplysninger gennemgået, før appen åbnes bredt.

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

4. Android: Åbn `android/` i Android Studio, eller byg en debug-APK med `cd android && ./gradlew assembleDebug`. APK'en bruger bladlogoet fra appens launcher-ikon og ligger i `android/app/build/outputs/apk/debug/`.
5. iOS: På en Mac, kør `npx cap open ios`, vælg et signing team i Xcode, og byg/arkivér appen der. En IPA til installation/distribution kræver Apples signering og en Apple-udviklerkonto. IPA kan ikke bygges eller signeres på Linux.

## Windows-app

Windows-udgaven er en `.exe`-installationsfil, som opretter genveje i Start-menuen og på skrivebordet. Installér den én gang, så appen starter direkte i stedet for at pakke sig selv ud ved hver start. Appindholdet hentes fra GitHub Pages, så internetforbindelse kræves. Byg installationsfilen på Windows med Node.js 22 eller nyere:

```sh
npm install
npm run desktop:build
```

Installationsfilen oprettes som `dist/hverdagens-app-setup.exe`. Den er ikke digitalt signeret; Windows kan vise en SmartScreen-advarsel ved første start.

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
