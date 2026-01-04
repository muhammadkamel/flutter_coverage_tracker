import { TestFileGenerator } from './TestFileGenerator';

export class TestFileGeneratorService {
    public async createTestFile(sourceFilePath: string, workspaceRoot: string): Promise<boolean> {
        return TestFileGenerator.createTestFile(sourceFilePath, workspaceRoot);
    }
}
