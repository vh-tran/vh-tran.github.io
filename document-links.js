(function () {
  document.querySelectorAll('a[href]').forEach(function (link) {
    var url;

    try {
      url = new URL(link.getAttribute('href'), document.baseURI);
    } catch (error) {
      return;
    }

    var opensDocument = url.pathname.toLowerCase().endsWith('.pdf');
    var opensArxiv = url.hostname === 'arxiv.org' || url.hostname.endsWith('.arxiv.org');

    if (opensDocument || opensArxiv) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.removeAttribute('download');
    }
  });
})();
