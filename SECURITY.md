# Security policy

Report suspected vulnerabilities through GitHub private vulnerability reporting
for this repository (Security tab, Report a vulnerability). If that option is
not available, open a public issue asking for a private coordination channel,
without exploit details. Include a minimal reproducer,
the affected revision, Node.js version, and platform in the private report.

The gate script and examples are in scope. Guide prose is out of scope;
scripts in the guide are in scope. Report vulnerabilities in adopting projects
to those projects through their own security processes.

The gate checks supported frozen-export syntax and associated test-file shape.
It cannot determine whether a boundary, classification, exemption, expected
list, test, consumer, or runtime behavior is safe or complete. It is a review
tripwire, not a runtime security boundary.

Security fixes are made on the current `main` branch. Older revisions are not maintained separately.

There is no response-time commitment.
