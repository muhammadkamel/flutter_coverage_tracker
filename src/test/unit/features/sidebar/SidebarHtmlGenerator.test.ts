import * as assert from 'assert';
import { SidebarHtmlGenerator } from '../../../../features/sidebar/SidebarHtmlGenerator';

suite('SidebarHtmlGenerator Test Suite', () => {
    const mockWebview = {
        asWebviewUri: (uri: any) => uri,
        options: {},
        html: '',
        onDidReceiveMessage: () => ({ dispose: () => {} }),
        postMessage: () => Promise.resolve(true),
        cspSource: ''
    };

    const mockExtensionUri = {
        fsPath: '/ext',
        toString: () => '/ext',
        toJSON: () => {}
    } as any;

    test('getWebviewContent generates HTML with correct stats', () => {
        const html = SidebarHtmlGenerator.getWebviewContent(mockWebview, mockExtensionUri, 75);

        assert.ok(html.includes('75%'), 'Should display coverage percentage');
        assert.ok(html.includes('Total Coverage'), 'Should display label');
        assert.ok(html.includes('Run Changed Files'), 'Should have run changed button');
        assert.ok(html.includes('Run Folder Tests...'), 'Should have run folder button');
    });

    test('getWebviewContent calculates progress circle correctly for high coverage', () => {
        const html = SidebarHtmlGenerator.getWebviewContent(mockWebview, mockExtensionUri, 90);
        // Green color
        assert.ok(html.includes('#4ade80'), 'Should use green for high coverage');
    });

    test('getWebviewContent calculates progress circle correctly for medium coverage', () => {
        const html = SidebarHtmlGenerator.getWebviewContent(mockWebview, mockExtensionUri, 60);
        // Yellow color
        assert.ok(html.includes('#fbbf24'), 'Should use yellow for medium coverage');
    });

    test('getWebviewContent calculates progress circle correctly for low coverage', () => {
        const html = SidebarHtmlGenerator.getWebviewContent(mockWebview, mockExtensionUri, 30);
        // Red color
        assert.ok(html.includes('#f87171'), 'Should use red for low coverage');
    });
});
