const fs=require('node:fs'),postcss=require('postcss'),parser=require('postcss-selector-parser');
const css=postcss.parse(fs.readFileSync('../../frontend/app/globals.css','utf8'));
css.walkRules(rule=>{let parent=rule.parent;while(parent){if(parent.type==='atrule'&&/keyframes$/i.test(parent.name))return;parent=parent.parent;}rule.selector=parser(selectors=>selectors.each(selector=>{let root=false;selector.walk(node=>{if((node.type==='pseudo'&&node.value===':root')||(node.type==='tag'&&['html','body'].includes(node.value))){node.replaceWith(parser.className({value:'cv-module'}));root=true;}});if(!root){selector.prepend(parser.combinator({value:' '}));selector.prepend(parser.className({value:'cv-module'}));}})).processSync(rule.selector);});
fs.writeFileSync('cv-module/module.css',css.toString()+`
.cv-module{font-family:Inter,Arial,sans-serif;min-width:0}.cv-module .sidebar,.cv-module .topbar,.cv-module .mobile-bottom,.cv-module .nav-backdrop{display:none!important}.cv-module .workspace{margin-left:0!important;width:100%;min-width:0}.cv-module .app-shell{min-height:0}.cv-module .main-content{padding:24px}.cv-module h1{margin:0}.cv-module .page-heading{margin-top:0}@media(max-width:520px){.cv-module .main-content{padding:16px}}
`);
console.log('CV module CSS scoped; original global styles unchanged.');
