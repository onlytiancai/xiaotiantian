$(function(){
    $('body').ajaxError(function(event, request, settings, err){
        console.log(event);
    });
    $.ajaxSetup({
        cache: false 
    });


    var blog    = {};
    blog.views  = {};
    blog.helper = {};

    blog.helper.build_main_model = function(data){
        var result        = {};
        result.site_name  = data.site_name;
        result.copyright  = data.copyright;
        result.navlist    = _.map(data.cates, function(cate){
            return {link: '#cate/'+ cate.name, text: cate.text};
        });
        return result;
    };

    blog.helper.build_sidebar_model = function(data, cate){
        var result   = {};

        var articles = data.articles;
        if(cate){
            articles = _.filter(articles, function(article){return article.cate == cate;});
        }
        
        result.months = _.groupBy(articles, function(article){
            return article.file.substring(0, 7);
        });
        result.months     = _.map(result.months, function(value, key){
            return {month: key, 
                articles: _.map(value, function(article){
                    return {link: article.file, text: article.title}
                })
            };
        });

        return result;
    };

    blog.helper.markdown = new Showdown.converter();

    blog.views.Sidebar = Backbone.View.extend({
        template: $('#tpl-sidebar').html(),
        initialize: function(options){
            this.model = options.model; 
            _.bindAll(this, 'render');
        },
        render: function(){
            var html = Mustache.to_html(this.template, this.model);
            $(this.el).append(html);
            return this;
        }
    });

    blog.views.Article = Backbone.View.extend({
        initialize: function(options){
            var that = this;
            this.article = options.article;
            _.bindAll(this, 'render');
            $.get('post/'+this.article+'.txt', function(data){
                that.model = data;
                that.render();
            });
        },
        render: function(){
            if(!this.model) return this;
            var html = blog.helper.markdown.makeHtml(this.model);
            $(this.el).html(html);
        }
    });

    blog.views.Main = Backbone.View.extend({
        el:$('.main-body'),
        template: $('#tpl-main').html(),
        initialize: function(){
            _.bindAll(this, 'render');
            _.bindAll(this, 'sync');
        },
        sync: function(){
            var that = this;
            $.getJSON('meta.js', function(data){
                that.data = data;
                that.render();
            });
        },
        render: function(){
            if(!this.data){
                this.sync();
                return this;
            }

            var main_model = blog.helper.build_main_model(this.data); 
            var main_html = Mustache.to_html(this.template, main_model);
            $(this.el).empty().append(main_html);

            var sidebar_mode = blog.helper.build_sidebar_model(this.data, this.cate);
            var sidebar_view = new blog.views.Sidebar({model: sidebar_mode});
            this.$(".sidebar-nav").empty().append(sidebar_view.render().el);

            if(this.cate){
                this.$('.navbar-inner .nav li a[href="#cate/'+this.cate+'"]').parent().addClass('active');
            }
            
            if(this.article){
                var article_view = new blog.views.Article({article:this.article});
                this.$(".article-content").empty().append(article_view.render().el);
            }
        }
    }); 

    blog.App = Backbone.Router.extend({
        routes: {
            ""              : "index",
            "cate/:cate"    : "cate",
            "show/:article" : "show"
        },
        make_main_view: function(cate, article){
            if(!this.main){
                this.main = new blog.views.Main();
            }
            this.main.cate = cate;
            this.main.article = article;
            this.main.render();
        }, 
        index: function(){
            this.make_main_view(null, 'index');
        },
        cate: function(cate){
            this.make_main_view(cate, 'index');
        },
        show: function(article){
            this.make_main_view(null, article);
        }
    });

    app = new blog.App();
    Backbone.history.start();
});
