(function(){
  var groups=window.__LINKS__;
  if(!groups||!groups.length){
    document.getElementById('error').style.display='block';
    return;
  }

  function slug(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}

  var toc=document.getElementById('toc');
  var container=document.getElementById('links');
  var noResults=document.getElementById('no-results');
  var search=document.getElementById('search');

  for(var i=0;i<groups.length;i++){
    var g=groups[i];
    var id=g.cat?slug(g.cat):'other';

    if(g.cat){
      var pill=document.createElement('a');
      pill.href='#'+id;
      pill.textContent=g.cat;
      pill.className='toc-item';
      toc.appendChild(pill);
    }

    var sec=document.createElement('section');
    sec.className='cat-section';
    sec.id=id;

    if(g.cat){
      var h=document.createElement('h2');
      h.className='cat-heading';
      h.textContent=g.cat;
      sec.appendChild(h);
    }

    for(var j=0;j<g.links.length;j++){
      var a=document.createElement('a');
      a.href=g.links[j].target;
      a.textContent=g.links[j].name;
      a.className='link-item';
      a.rel='noopener noreferrer';
      a.dataset.umamiEvent='link-click';
      a.dataset.umamiEventName=g.links[j].name;
      a.dataset.umamiEventCat=g.cat||'';
      sec.appendChild(a);
    }

    container.appendChild(sec);
  }

  search.addEventListener('input',function(){
    var q=this.value.trim().toLowerCase();
    var anyVisible=false;
    var sections=container.querySelectorAll('.cat-section');
    for(var s=0;s<sections.length;s++){
      var items=sections[s].querySelectorAll('.link-item');
      var secVisible=false;
      for(var k=0;k<items.length;k++){
        var match=!q||items[k].textContent.toLowerCase().indexOf(q)!==-1;
        items[k].classList.toggle('hidden',!match);
        if(match)secVisible=true;
      }
      sections[s].classList.toggle('hidden',!secVisible);
      if(secVisible)anyVisible=true;
    }
    noResults.style.display=anyVisible||!q?'none':'block';
    toc.style.display=q?'none':'flex';
  });

  var backBtn=document.getElementById('back-to-links');
  window.addEventListener('scroll',function(){
    var below=toc.getBoundingClientRect().bottom<0;
    backBtn.classList.toggle('visible',below);
  });
  backBtn.addEventListener('click',function(){
    toc.scrollIntoView({behavior:'smooth'});
  });
})();
