module("Paging", {
    setup: function () {
        this.scene = new XML3DTestLib.Scene();
        this.scene.createDrawable = function() {
            return null; // Prevents material creation
        };
    }
});

var SIZES = {
 PAGE:  1 << 12,
    GROUP: 38,
    OBJECT: 108,
    VIEW:   48


}

test("Init", 4, function() {
    ok(this.scene.rootNode);
    var pager = this.scene.pager;
    equal(pager.pages.length, 1, "Initial page created");
    equal(pager.pages[0].length, SIZES.PAGE, "Page size");
    equal(pager.nextOffset, SIZES.GROUP, "Initial offset of implicit root node");
});

test("RenderGroup", 6, function() {
    var ENTRY_SIZE = SIZES.GROUP;
    var pager = this.scene.pager;
    var expectedOffset = pager.nextOffset;
    var renderGroup = this.scene.createRenderGroup();
    ok(renderGroup);
    equal(pager.pages.length, 1, "Page size");
    expectedOffset += ENTRY_SIZE;
    equal(pager.nextOffset, expectedOffset, "New offset");

    var childGroup = this.scene.createRenderGroup({parent: renderGroup });
    strictEqual(childGroup.getParent(), renderGroup, "Parent is set");
    notEqual(renderGroup.children.indexOf(childGroup),-1, "In child list");
    expectedOffset += ENTRY_SIZE;
    equal(pager.nextOffset, expectedOffset, "New offset");
});

test("RenderView", 2, function() {
    var ENTRY_SIZE = SIZES.VIEW;
    var pager = this.scene.pager;
    var expectedOffset = pager.nextOffset;
    var renderView = this.scene.createRenderView();
    ok(renderView);
    expectedOffset += ENTRY_SIZE;
    equal(pager.nextOffset, expectedOffset, "New offset");
});

test("RenderObject", 6, function() {
    var ENTRY_SIZE = SIZES.OBJECT;
    var pager = this.scene.pager;
    var expectedOffset = pager.nextOffset;

    this.scene.createRenderObject();
    equal(pager.pages.length, 1, "Page size");
    expectedOffset += ENTRY_SIZE;
    equal(pager.nextOffset, expectedOffset, "New offset");
    this.scene.createRenderObject();
    equal(pager.pages.length, 1, "Page size");
    expectedOffset += ENTRY_SIZE;
    equal(pager.nextOffset, expectedOffset, "New offset");
    for (var i = 0; i < Math.floor(SIZES.PAGE/ ENTRY_SIZE); i++) {
        this.scene.createRenderObject();
    }
    equal(pager.pages.length, 2, "New page size");
    equal(pager.nextOffset, 2 * ENTRY_SIZE, "New offset");

});


test("Delete render objects", 11, function() {
    // Attach to root object
    var ENTRY_SIZE = SIZES.OBJECT;
    var pager = this.scene.pager;

    var expectedOffset = pager.nextOffset;

    var children = [];
    for(var i= 0; i < 5; i++) {
        children[i] = this.scene.createRenderObject();
        expectedOffset += ENTRY_SIZE;
    }
    equal(pager.nextOffset, expectedOffset, "New offset");

    equal(this.scene.rootNode.getChildren().length, 5, "5 children added");
    //equal(this.scene.queue.length, 5, "5 render objects in queue");
    children[2].remove();
    equal(this.scene.rootNode.getChildren().length, 4, "1 child removed");
    //equal(this.scene.queue.length, 4, "4 render objects in queue");
    equal(pager.nextOffset, expectedOffset, "Offset not changed");

    children[2] = this.scene.createRenderObject();
    equal(pager.nextOffset, expectedOffset, "Page entry reused");

    children[5] = this.scene.createRenderObject();
    expectedOffset += ENTRY_SIZE;
    equal(pager.nextOffset, expectedOffset, "New page entry created");

    for (var i = 6; i < Math.floor(SIZES.PAGE / ENTRY_SIZE)+1; i++) {
        children[i] = this.scene.createRenderObject();
    }
    expectedOffset = ENTRY_SIZE;
    equal(pager.nextOffset, expectedOffset, "Offset reset");
    strictEqual(children[children.length-1].page, pager.pages[1], "Child on second page");

    children[5].remove();
    equal(pager.nextOffset, expectedOffset, "Offset not changed");
    children[2] = this.scene.createRenderObject();
    strictEqual(children[2].page, pager.pages[0], "New child on first page");

    children.push(this.scene.createRenderObject());
    strictEqual(children[children.length-1].page, pager.pages[1], "New child on second page");


});

