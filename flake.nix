{
  outputs = { self, nixpkgs }: with nixpkgs.legacyPackages.x86_64-linux; {
    devShell.x86_64-linux = mkShellNoCC {
      buildInputs = [
        nodejs-16_x
        nodePackages.pnpm
        jdk
      ];
      shellHook = ''
        for npm_dir in $(git ls-files | grep pnpm-lock.yaml); do pnpm install --dir $(dirname "$npm_dir"); done
      '';
    };
  };
}
