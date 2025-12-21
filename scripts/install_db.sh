echo "Checking if Homebrew is installed..."
if ! command -v brew >/dev/null 2>&1; then
  echo "❌ Homebrew not found. Please install Homebrew first:"
  echo "/bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
  exit 1
fi


echo "Checking if PostgreSQL 14 is installed..."
if brew list postgresql@14 >/dev/null 2>&1; then
  echo "PostgreSQL 14 is already installed."
else
  echo "Installing PostgreSQL 14..."
  brew install postgresql@14

  echo "Linking PostgreSQL tools..."
  brew link postgresql@14 --force

  echo "PostgreSQL installation complete."
  echo "PostgreSQL version:"
  psql --version
fi

brew services start postgresql@14

