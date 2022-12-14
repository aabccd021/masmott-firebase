{
  outputs = { self, nixpkgs }: with nixpkgs.legacyPackages.x86_64-linux; {
    devShell.x86_64-linux = mkShellNoCC {
      buildInputs = [
        nodejs-16_x
        nodePackages.pnpm
        jdk
      ];
      shellHook = ''
        [ ! -d "node_modules" ] && pnpm install
      '';
    };
  };
}
