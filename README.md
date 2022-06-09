Generate invitation

```bash
INVITATION_URL=$(curl localhost:3001/invitation)
```

Accept invitation

```bash
urlencode() {
  python -c 'import urllib, sys; print urllib.quote(sys.argv[1], sys.argv[2])' \
    "$1" "$urlencode_safe"
}
INVITATION_URL_SAFE=$(urlencode ${INVITATION_URL})
curl "http://localhost:3002/receive-invitation?url=${INVITATION_URL_SAFE}" | jq
# copy the "@id" on the response
curl "http://localhost:3002/invitation/33b08830-f1d9-4b43-94cf-2c501a82e0e8"

```


