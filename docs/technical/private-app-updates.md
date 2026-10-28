# Private LuLu app updates

The iOS and Android builds contain a native updater. Open **Settings → App updates** to see the installed version. LuLu checks when that section opens, and **Check for updates** checks again. If a compatible update is available, choose **Install update**. No floating prompt or push notification is used.

The app accepts only encrypted bundles verified using its embedded public key. The installed updater requires an RSA-2048 signing key. The matching private key is stored locally at `~/.config/lulu-updates/private.pem` and must not be committed or shared. Back it up securely: if it is lost or replaced, a new native build containing a new public key is required. The updater rolls back when the newly loaded bundle fails to report readiness at startup; that does not guarantee rollback for every later runtime error.

## Prepare and publish a compatible update

Use a higher three-part update version each time. The second argument is the exact installed native app version; check it for both platforms before targeting them. The current debug builds use `1.0`.

```sh
npm run ota:publish -- 1.0.2 1.0
```

The preparation command builds the app, creates a signed encrypted archive and a manifest in `public/updates/`. Commit the generated manifest and signed release archive with the release so later Hosting deployments retain them. The previous release must remain hosted until the new deployment is ready. The command rejects an existing local bundle with the same version. Only use this path for updates compatible with the installed native app; native code, permissions, plugins, the updater itself and its signing key require a new native build and installation. Test each update on a device before relying on it.

The built-in native version, signed bundle versions and native plugin compatibility are separate. This flow does not replace Apple signing or extend the expiration of an iOS development provisioning profile.
