// A direct link to the raw scene still opens with the Labs navigation.
if(window.self===window.top){
  const shell=new URL('./index.html',window.location.href);
  shell.search=window.location.search;
  shell.hash=window.location.hash;
  window.location.replace(shell.href);
}
