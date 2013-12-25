git co master -- test/build
cp -r test/build/* .
rm -r test
mv bundle.js bundle.dev.js
uglifyjs bundle.dev.js > bundle.js
echo "Done"

