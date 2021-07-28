##### 160over90 - Ad Technology

# FBA Compiler

This utility optionally packs binary assets (images, fonts, ...) into a single PNG file.

The benefit of doing so is that your ad will make fewer requests for assets. The downside is that additional cycles are necessary to parse the fba-payload back into dataURIs for DOM elements.

Tests should be done to see if networks supporting HTTP2 load multiple image/font requests faster than the client can parse the FBA-payload.

Switch on FBA-compiling in [Creative Server](https://github.com/ff0000-ad-tech/wp-creative-server) in the deploy profile, like:

![Creative Server: FBA-compiling switch](https://github.com/ff0000-ad-tech/fba-compiler/tree/master/docs/images/cs-control.png)
