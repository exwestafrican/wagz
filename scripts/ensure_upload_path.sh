source .env # reads every line into the current shell
if [ -d "$UPLOAD_HOST_DIR" ]; then
  echo "Directory exists."
else
  sudo mkdir -p "$UPLOAD_HOST_DIR"
  sudo chown 1001:1001 "$UPLOAD_HOST_DIR"
fi