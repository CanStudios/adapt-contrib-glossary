define([
  'core/js/adapt',
  './adapt-contrib-glossaryItemView'
], function(Adapt, GlossaryItemView) {

  var GlossaryView = Backbone.View.extend({

    className: "m-glossary",

    events: {
      'keyup .js-glossary-item-input-textbox': 'onInputTextBoxValueChange',
      'input .js-glossary-item-input-textbox': 'onInputTextBoxValueChange',
      'paste .js-glossary-item-input-textbox': 'onInputTextBoxValueChange',
      'change .js-glossary-item-input-textbox': 'onInputTextBoxValueChange',
      'click .js-glossary-cancel': 'onCancelButtonClick'
    },

    itemViews: null,

    initialize: function() {
      this.listenTo(Adapt, 'remove drawer:closed', this.remove);

      this.setupModel();

      this.render();

      this.checkForTermToShow();
    },

    checkForTermToShow: function() {
      if(this.$el.data('termtoshow') === undefined) return;

      for(var i = 0, count = this.itemViews.length; i < count; i++) {
        var itemView = this.itemViews[i];
        if(itemView.model.get('term').toLowerCase() === this.$el.data('termtoshow').toLowerCase()) {
          Adapt.trigger('glossary:descriptionOpen', itemView.model.cid);
          break;
        }
      }
    },

    remove: function() {
      this.itemViews = null;

      Backbone.View.prototype.remove.apply(this, arguments);
    },

    setupModel: function() {
      this.arrangeGlossaryItemsToAscendingOrder();
    },

    arrangeGlossaryItemsToAscendingOrder: function() {
      function caseInsensitiveComparator(model1, model2) {
        return model1.get('term').toLowerCase().localeCompare(model2.get('term').toLowerCase());
      }

      this.collection.comparator = caseInsensitiveComparator;
      this.collection.sort();
    },

    render: function() {
      var template = Handlebars.templates["glossary"];
      this.$el.html(template(this.model.toJSON()));
      this.renderGlossaryItems();
      _.defer(_.bind(function() {
        this.postRender();
      }, this));
      return this;
    },

    renderGlossaryItems: function() {
      this.itemViews = [];
      var $glossaryItemContainer = this.$('.js-glossary-item-container').empty();
      _.each(this.collection.models, function(item, index) {
        var itemView = new GlossaryItemView({model: item});
        itemView.$el.appendTo($glossaryItemContainer);
        // store a reference to each of the views so that checkForTermToShow can search through them
        this.itemViews.push(itemView);
      }, this);
    },

    postRender: function() {
      this.listenTo(Adapt, {
        'drawer:openedItemView': this.remove,
        'drawer:triggerCustomView': this.remove
      });
    },

    onInputTextBoxValueChange: _.debounce(function(event) {
      this.showItemNotFoundMessage(false);
      var searchItem = this.$('.js-glossary-item-input-textbox').val().toLowerCase();
      var shouldSearchInDescription = this.$('.js-glossary-item-input-checkbox').is(":checked");

      if(searchItem.length > 0) {
        this.$('.js-glossary-cancel').removeClass('u-display-none');
        var filteredItems = this.getFilteredGlossaryItems(searchItem, shouldSearchInDescription);
        this.showFilterGlossaryItems(filteredItems);
      } else {
        this.$('.js-glossary-cancel').addClass('u-display-none');
        this.showGlossaryItems(true);
      }
    }, 200),

    onCancelButtonClick: function(event) {
      if(event && event.preventDefault) event.preventDefault();
      this.$('.js-glossary-item-input-textbox').val("").trigger("input");
    },

    // create array of filtered items on basis of supplied arguments.
    getFilteredGlossaryItems: function(searchItem, shouldSearchInDescription) {
      var terms = searchItem.split(' ');

      return this.collection.filter(function(model) {
        return _.every(terms, function(term) {
          var title = model.get('term').toLowerCase();
          var description = model.get('description').toLowerCase();

          return shouldSearchInDescription ?
            title.indexOf(term) !== -1 || description.indexOf(term) !== -1 :
            title.indexOf(term) !== -1;
        });
      });
    },

    // show only the filtered glossary items or no item found message
    showFilterGlossaryItems: function(filteredItems) {
      this.showGlossaryItems(false);
      if(filteredItems.length > 0) {
        _.each(filteredItems, function(item, index) {
          item.set('_isVisible', true);
        });
      } else {
        this.showItemNotFoundMessage(true);
      }
    },

    // show/hide the item not found message.
    showItemNotFoundMessage: function(_isVisible) {
      var $itemNotFound = this.$('.js-glossary-item-not-found');

      if(!_isVisible && !$itemNotFound.hasClass('u-display-none')) {
        $itemNotFound.addClass('u-display-none');
      } else if(_isVisible && $itemNotFound.hasClass('u-display-none')) {
        $itemNotFound.removeClass('u-display-none');
      }
    },

    // change the visibility of all glossary items
    showGlossaryItems: function(_isVisible) {
      _.invoke(this.collection.models, 'set', { '_isVisible': _isVisible });
    }

  });

  return GlossaryView;

});
