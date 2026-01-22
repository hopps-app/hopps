package app.fuggs.workflow;

import static org.junit.jupiter.api.Assertions.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import jakarta.inject.Inject;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import app.fuggs.organization.domain.Organization;
import app.fuggs.shared.BaseOrganizationTest;
import app.fuggs.shared.TestSecurityHelper;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import app.fuggs.audit.domain.AuditLogEntry;
import app.fuggs.audit.repository.AuditLogRepository;
import app.fuggs.workflow.repository.WorkflowInstanceRepository;

@QuarkusTest
@TestSecurity(user = TestSecurityHelper.TEST_USER_MARIA, roles = "user")
class ProcessEngineTest extends BaseOrganizationTest
{
	@Inject
	ProcessEngine processEngine;

	@Inject
	AuditLogRepository auditLogRepository;

	@Inject
	WorkflowInstanceRepository chainRepository;

	@Inject
	CalculateTotalTask calculateTotalTask;

	@Inject
	SendNotificationTask sendNotificationTask;

	@Inject
	ApprovalTask approvalTask;

	@Inject
	EnterOrderDetailsTask enterOrderDetailsTask;

	/**
	 * Set up organization context for all tests. This creates a test
	 * organization and links a test member to it, so that
	 * OrganizationContext.getCurrentOrganization() works correctly.
	 */
	@BeforeEach
	void setupOrganizationContext()
	{
		Organization testOrg = getOrCreateTestOrganization();
		createTestMember(TestSecurityHelper.TEST_USER_MARIA, testOrg);
	}

	@TestTransaction
	@Test
	void givenSystemTasksOnly_whenStartProcess_thenCompletesImmediately()
	{
		ProcessDefinition process = new ProcessDefinition("SimpleCalculation")
			.addTask(calculateTotalTask)
			.addTask(sendNotificationTask);

		Map<String, Object> initialVars = new HashMap<>();
		initialVars.put("price", 10.0);
		initialVars.put("quantity", 5);
		initialVars.put("recipient", "customer@example.com");

		WorkflowInstance instance = processEngine.startProcess(process, initialVars);

		assertEquals(WorkflowStatus.COMPLETED, instance.getStatus());
		assertEquals(50.0, instance.getVariable("total"));
		assertTrue((Boolean)instance.getVariable("notificationSent"));

		List<AuditLogEntry> logs = auditLogRepository.findByWorkflowInstanceId(instance.getId());
		assertFalse(logs.isEmpty());
		assertTrue(logs.stream().anyMatch(l -> "ProcessStarted".equals(l.getTaskName())));
		assertTrue(logs.stream().anyMatch(l -> "CalculateTotal".equals(l.getTaskName())));
		assertTrue(logs.stream().anyMatch(l -> "SendNotification".equals(l.getTaskName())));
		assertTrue(logs.stream().anyMatch(l -> "ProcessCompleted".equals(l.getTaskName())));
	}

	@TestTransaction
	@Test
	void givenUserTask_whenStartProcess_thenWaitsForUser()
	{
		ProcessDefinition process = new ProcessDefinition("OrderWithApproval")
			.addTask(enterOrderDetailsTask)
			.addTask(calculateTotalTask);

		WorkflowInstance instance = processEngine.startProcess(process);

		assertEquals(WorkflowStatus.WAITING, instance.getStatus());
		assertTrue(instance.isWaitingForUser());
		assertEquals("EnterOrderDetails", instance.getCurrentUserTask());
	}

	@TestTransaction
	@Test
	void givenWaitingChain_whenCompleteUserTask_thenResumes()
	{
		ProcessDefinition process = new ProcessDefinition("OrderWithApproval")
			.addTask(enterOrderDetailsTask)
			.addTask(calculateTotalTask)
			.addTask(sendNotificationTask);

		WorkflowInstance instance = processEngine.startProcess(process);
		assertEquals(WorkflowStatus.WAITING, instance.getStatus());

		Map<String, Object> userInput = new HashMap<>();
		userInput.put("price", 25.0);
		userInput.put("quantity", 4);
		userInput.put("recipient", "test@example.com");

		WorkflowInstance updatedInstance = processEngine.completeUserTask(instance.getId(), userInput, "testuser");

		assertEquals(WorkflowStatus.COMPLETED, updatedInstance.getStatus());
		assertEquals(100.0, updatedInstance.getVariable("total"));
		assertTrue((Boolean)updatedInstance.getVariable("notificationSent"));
	}

	@TestTransaction
	@Test
	void givenMultipleUserTasks_whenCompleteSequentially_thenProcessCompletes()
	{
		ProcessDefinition process = new ProcessDefinition("ApprovalProcess")
			.addTask(enterOrderDetailsTask)
			.addTask(calculateTotalTask)
			.addTask(approvalTask)
			.addTask(sendNotificationTask);

		WorkflowInstance instance = processEngine.startProcess(process);
		assertEquals(WorkflowStatus.WAITING, instance.getStatus());
		assertEquals("EnterOrderDetails", instance.getCurrentUserTask());

		Map<String, Object> orderDetails = new HashMap<>();
		orderDetails.put("price", 100.0);
		orderDetails.put("quantity", 2);
		orderDetails.put("recipient", "customer@test.com");

		instance = processEngine.completeUserTask(instance.getId(), orderDetails, "clerk");

		assertEquals(WorkflowStatus.WAITING, instance.getStatus());
		assertEquals("ManagerApproval", instance.getCurrentUserTask());
		assertEquals(200.0, instance.getVariable("total"));

		Map<String, Object> approval = new HashMap<>();
		approval.put("approved", true);
		approval.put("comment", "Looks good!");

		instance = processEngine.completeUserTask(instance.getId(), approval, "manager");

		assertEquals(WorkflowStatus.COMPLETED, instance.getStatus());
		assertTrue((Boolean)instance.getVariable("approved"));
		assertEquals("Looks good!", instance.getVariable("approvalComment"));
		assertTrue((Boolean)instance.getVariable("notificationSent"));
	}

	@TestTransaction
	@Test
	void givenRejectedApproval_whenComplete_thenProcessFails()
	{
		ProcessDefinition process = new ProcessDefinition("RejectionProcess")
			.addTask(enterOrderDetailsTask)
			.addTask(approvalTask)
			.addTask(sendNotificationTask);

		WorkflowInstance instance = processEngine.startProcess(process);

		Map<String, Object> orderDetails = new HashMap<>();
		orderDetails.put("price", 50.0);
		orderDetails.put("quantity", 1);
		instance = processEngine.completeUserTask(instance.getId(), orderDetails, "clerk");

		Map<String, Object> rejection = new HashMap<>();
		rejection.put("approved", false);
		rejection.put("comment", "Too expensive");

		instance = processEngine.completeUserTask(instance.getId(), rejection, "manager");

		assertEquals(WorkflowStatus.FAILED, instance.getStatus());
		assertFalse((Boolean)instance.getVariable("approved"));
		assertEquals("Request was rejected", instance.getError());
		assertNull(instance.getVariable("notificationSent"));
	}

	@TestTransaction
	@Test
	void givenInvalidUserInput_whenComplete_thenValidationFails()
	{
		ProcessDefinition process = new ProcessDefinition("ValidationTest")
			.addTask(enterOrderDetailsTask)
			.addTask(calculateTotalTask);

		WorkflowInstance instance = processEngine.startProcess(process);

		Map<String, Object> invalidInput = new HashMap<>();
		invalidInput.put("price", 10.0);
		invalidInput.put("quantity", -5);

		WorkflowInstance result = processEngine.completeUserTask(instance.getId(), invalidInput, "user");

		assertEquals(WorkflowStatus.FAILED, result.getStatus());
		assertNotNull(result.getError());
	}

	@TestTransaction
	@Test
	void givenChainId_whenGetChain_thenReturnsChain()
	{
		ProcessDefinition process = new ProcessDefinition("GetChainTest")
			.addTask(enterOrderDetailsTask);

		WorkflowInstance instance = processEngine.startProcess(process);

		WorkflowInstance retrieved = processEngine.getChain(instance.getId());

		assertNotNull(retrieved);
		assertEquals(instance.getId(), retrieved.getId());
	}

	@TestTransaction
	@Test
	void givenStartedProcess_whenCheckDatabase_thenChainIsPersisted()
	{
		ProcessDefinition process = new ProcessDefinition("PersistenceTest")
			.addTask(calculateTotalTask)
			.addTask(sendNotificationTask);

		Map<String, Object> vars = new HashMap<>();
		vars.put("price", 20.0);
		vars.put("quantity", 3);
		vars.put("recipient", "test@example.com");

		WorkflowInstance instance = processEngine.startProcess(process, vars);

		WorkflowInstance persisted = chainRepository.findById(instance.getId());
		assertNotNull(persisted, "WorkflowInstance should be persisted to database");
		assertEquals(instance.getId(), persisted.getId());
		assertEquals("PersistenceTest", persisted.getProcessName());
		assertEquals(WorkflowStatus.COMPLETED, persisted.getStatus());
		assertNotNull(persisted.getCreatedAt());
		assertNotNull(persisted.getUpdatedAt());
	}

	@TestTransaction
	@Test
	void givenPersistedChain_whenLoadFromDatabase_thenCanResume()
	{
		ProcessDefinition process = new ProcessDefinition("ResumeTest")
			.addTask(enterOrderDetailsTask)
			.addTask(calculateTotalTask)
			.addTask(sendNotificationTask);

		WorkflowInstance originalInstance = processEngine.startProcess(process);
		String workflowInstanceId = originalInstance.getId();

		WorkflowInstance loadedInstance = chainRepository.findById(workflowInstanceId);

		assertNotNull(loadedInstance);
		assertEquals(WorkflowStatus.WAITING, loadedInstance.getStatus());
		assertTrue(loadedInstance.isWaitingForUser());
		assertEquals("EnterOrderDetails", loadedInstance.getCurrentUserTask());

		Map<String, Object> userInput = new HashMap<>();
		userInput.put("price", 15.0);
		userInput.put("quantity", 2);
		userInput.put("recipient", "resume@test.com");

		WorkflowInstance completed = processEngine.completeUserTask(workflowInstanceId, userInput, "testuser");
		assertEquals(WorkflowStatus.COMPLETED, completed.getStatus());
	}

	@TestTransaction
	@Test
	void givenVariousVariableTypes_whenPersist_thenSerializedCorrectly()
	{
		ProcessDefinition process = new ProcessDefinition("VariableSerializationTest")
			.addTask(calculateTotalTask);

		Map<String, Object> vars = new HashMap<>();
		vars.put("stringVar", "test value");
		vars.put("intVar", 42);
		vars.put("doubleVar", 3.14);
		vars.put("boolVar", true);
		vars.put("listVar", List.of("item1", "item2", "item3"));
		vars.put("mapVar", Map.of("key1", "value1", "key2", 123));
		vars.put("price", 10.0);
		vars.put("quantity", 5);

		WorkflowInstance instance = processEngine.startProcess(process, vars);

		WorkflowInstance loaded = chainRepository.findById(instance.getId());
		assertNotNull(loaded);

		assertEquals("test value", loaded.getVariable("stringVar"));
		assertEquals(42, loaded.getVariable("intVar"));
		assertEquals(3.14, loaded.getVariable("doubleVar"));
		assertEquals(true, loaded.getVariable("boolVar"));

		@SuppressWarnings("unchecked")
		List<String> list = (List<String>)loaded.getVariable("listVar");
		assertEquals(3, list.size());
		assertTrue(list.contains("item1"));

		@SuppressWarnings("unchecked")
		Map<String, Object> map = (Map<String, Object>)loaded.getVariable("mapVar");
		assertEquals("value1", map.get("key1"));
		assertEquals(123, map.get("key2"));

		assertEquals(50.0, loaded.getVariable("total"));
	}

	@TestTransaction
	@Test
	void givenWorkflowInstanceRepository_whenQueryByStatus_thenFindsCorrectChains()
	{
		ProcessDefinition completedProcess = new ProcessDefinition("CompletedProcess")
			.addTask(calculateTotalTask);

		ProcessDefinition waitingProcess = new ProcessDefinition("WaitingProcess")
			.addTask(enterOrderDetailsTask);

		Map<String, Object> vars = new HashMap<>();
		vars.put("price", 10.0);
		vars.put("quantity", 2);

		WorkflowInstance completed1 = processEngine.startProcess(completedProcess, vars);
		WorkflowInstance completed2 = processEngine.startProcess(completedProcess, vars);
		WorkflowInstance waiting1 = processEngine.startProcess(waitingProcess);
		WorkflowInstance waiting2 = processEngine.startProcess(waitingProcess);

		List<WorkflowInstance> completedChains = chainRepository.findByStatusInCurrentOrg(WorkflowStatus.COMPLETED);
		List<WorkflowInstance> waitingChains = chainRepository.findWaitingChains();
		List<WorkflowInstance> activeChains = chainRepository.findActiveChains();

		assertEquals(2, completedChains.size());
		assertEquals(2, waitingChains.size());
		assertEquals(2, activeChains.size());

		assertTrue(completedChains.stream().anyMatch(c -> c.getId().equals(completed1.getId())));
		assertTrue(completedChains.stream().anyMatch(c -> c.getId().equals(completed2.getId())));
		assertTrue(waitingChains.stream().anyMatch(c -> c.getId().equals(waiting1.getId())));
		assertTrue(waitingChains.stream().anyMatch(c -> c.getId().equals(waiting2.getId())));
	}
}
