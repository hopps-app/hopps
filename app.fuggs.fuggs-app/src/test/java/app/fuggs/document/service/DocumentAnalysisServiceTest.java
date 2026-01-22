package app.fuggs.document.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import app.fuggs.document.domain.AnalysisStatus;
import app.fuggs.document.domain.Document;
import app.fuggs.document.workflow.DocumentProcessingWorkflow;
import app.fuggs.workflow.WorkflowInstance;

@ExtendWith(MockitoExtension.class)
class DocumentAnalysisServiceTest
{
	@Mock
	DocumentProcessingWorkflow documentProcessingWorkflow;

	@Mock
	WorkflowInstance workflowInstance;

	@InjectMocks
	DocumentAnalysisService documentAnalysisService;

	private Document document;

	@BeforeEach
	void setUp()
	{
		document = new Document();
		document.id = 123L;
	}

	@Test
	void shouldTriggerAnalysisSuccessfully()
	{
		// Given
		String analyzedBy = "test-user";
		String workflowInstanceId = "workflow-123";
		when(documentProcessingWorkflow.startProcessing(document.getId())).thenReturn(workflowInstance);
		when(workflowInstance.getId()).thenReturn(workflowInstanceId);

		// When
		boolean result = documentAnalysisService.triggerAnalysis(document, analyzedBy);

		// Then
		assertTrue(result);
		assertEquals(workflowInstanceId, document.getWorkflowInstanceId());
		assertEquals(analyzedBy, document.getAnalyzedBy());
		verify(documentProcessingWorkflow).startProcessing(document.getId());
	}

	@Test
	void shouldReturnFalseWhenAnalysisTriggerFails()
	{
		// Given
		String analyzedBy = "test-user";
		when(documentProcessingWorkflow.startProcessing(document.getId()))
			.thenThrow(new RuntimeException("Workflow error"));

		// When
		boolean result = documentAnalysisService.triggerAnalysis(document, analyzedBy);

		// Then
		assertFalse(result);
		verify(documentProcessingWorkflow).startProcessing(document.getId());
	}

	@Test
	void shouldMarkAnalysisAsFailed()
	{
		// Given
		String errorMessage = "AI service unavailable";

		// When
		documentAnalysisService.markAnalysisFailed(document, errorMessage);

		// Then
		assertEquals(AnalysisStatus.FAILED, document.getAnalysisStatus());
		assertEquals(errorMessage, document.getAnalysisError());
	}

	@Test
	void shouldHandleNullErrorMessage()
	{
		// When
		documentAnalysisService.markAnalysisFailed(document, null);

		// Then
		assertEquals(AnalysisStatus.FAILED, document.getAnalysisStatus());
		assertNull(document.getAnalysisError());
	}

	@Test
	void shouldHandleBlankAnalyzedBy()
	{
		// Given
		String analyzedBy = "";
		when(documentProcessingWorkflow.startProcessing(document.getId())).thenReturn(workflowInstance);
		when(workflowInstance.getId()).thenReturn("workflow-123");

		// When
		boolean result = documentAnalysisService.triggerAnalysis(document, analyzedBy);

		// Then
		assertTrue(result);
		assertEquals("", document.getAnalyzedBy());
	}

	@Test
	void shouldHandleBlankErrorMessage()
	{
		// When
		documentAnalysisService.markAnalysisFailed(document, "");

		// Then
		assertEquals(AnalysisStatus.FAILED, document.getAnalysisStatus());
		assertEquals("", document.getAnalysisError());
	}

	@Test
	void shouldPreserveExistingWorkflowInstanceIdWhenTriggerFails()
	{
		// Given
		String existingWorkflowId = "existing-workflow-123";
		document.setWorkflowInstanceId(existingWorkflowId);
		when(documentProcessingWorkflow.startProcessing(document.getId()))
			.thenThrow(new RuntimeException("Service unavailable"));

		// When
		boolean result = documentAnalysisService.triggerAnalysis(document, "test-user");

		// Then
		assertFalse(result);
		// Workflow ID should remain unchanged when trigger fails
		assertEquals(existingWorkflowId, document.getWorkflowInstanceId());
	}

	@Test
	void shouldMarkAlreadyFailedDocumentAsFailedAgain()
	{
		// Given
		document.setAnalysisStatus(AnalysisStatus.FAILED);
		document.setAnalysisError("First error");

		// When
		documentAnalysisService.markAnalysisFailed(document, "Second error");

		// Then
		assertEquals(AnalysisStatus.FAILED, document.getAnalysisStatus());
		assertEquals("Second error", document.getAnalysisError());
	}
}
