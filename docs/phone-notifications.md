# Phone notifications

The ERP uses browser push notifications. Push alerts can arrive while the
dashboard is in the background or closed. The sound and vibration used for
background alerts are controlled by the phone's browser and notification
settings. While the ERP is open, administrators can also turn the in-page
notification tone on or off from the notification panel.

## Configure the server

Generate one VAPID key pair in a trusted terminal:

```sh
npx web-push generate-vapid-keys
```

Set all three values in the Render backend environment. Keep the private key
server-side and do not commit it or put it in frontend configuration.

```text
VAPID_PUBLIC_KEY=<generated public key>
VAPID_PRIVATE_KEY=<generated private key>
VAPID_SUBJECT=mailto:<monitored school administrator email>
```

After redeploying the backend, an administrator can open the notification bell
on a phone and choose **Enable phone alerts**. Allow browser notifications when
prompted. On iPhone/iPad, add the ERP to the Home Screen and open that installed
web app before enabling alerts; iOS requires an installed web app for Web Push.

The push-subscription migration is additive and is applied by the backend
`prestart` migration command. Disabling alerts from the same device removes its
server subscription.
