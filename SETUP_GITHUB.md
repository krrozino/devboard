# First GitHub push

Create an empty repository named `devboard` on GitHub, then run from this folder:

```bash
git init
git add .
git commit -m "chore: bootstrap DevBoard foundation"
git branch -M main
git remote add origin <YOUR_REPOSITORY_URL>
git push -u origin main
```

After the repository exists, create the first development branch:

```bash
git checkout -b feat/github-identity
```
