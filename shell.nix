with (import <nixpkgs> { });
mkShell {
  buildInputs = [
    jdk
    nodejs-16_x
    nodePackages.pnpm
    nodePackages.eslint_d
  ];
}

