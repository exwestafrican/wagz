after setting up server, we need to renew https
we can do that with cert bot renew command

But after it auto-renews, it needs nginx to use new certificate
to do that,

Check if Post deploy hook  exists. this command runs after the certificate is renewed 

```aiignore
$ sudo grep -R "deploy-hook" /etc/letsencrypt
```

if it doesn't exist, lets add it 

```aiignore
$ sudo vi /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

paste contents in `post-renew-hook.sh`

then run

```aiignore
$ sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

