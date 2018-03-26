module.exports.home = (req, res, next) => {
  var paths = ['images/sample-1.jpg', 'images/sample-2.jpg', 'images/sample-3.jpg'];
  
  res.render('gallery', { imgs: paths, layout: false });
};